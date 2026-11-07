/* Ordered, lossless teaching model. One step is an illustrative time unit. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.TCPModel = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const constants = Object.freeze({ CAPACITY: 600, MSS: 200, TOTAL: 12000 });
  const ids = ['A', 'B'];
  const opposite = id => id === 'A' ? 'B' : 'A';

  function node(base, remoteBase) {
    return {
      base, sndUna: base, sndNxt: base, rcvNxt: remoteBase,
      peerRight: base + constants.CAPACITY,
      queued: constants.TOTAL, rx: 0, reading: true, sending: true,
      sent: 0, received: 0, delivered: 0,
      receive: { before: 0, arrived: 0, buffered: 0, read: 0 }
    };
  }

  function initialState() {
    return {
      tick: 0,
      nodes: { A: node(1001, 5001), B: node(5001, 1001) },
      packets: [], events: []
    };
  }

  function copy(state) {
    return {
      tick: state.tick,
      nodes: {
        A: { ...state.nodes.A, receive: { ...state.nodes.A.receive } },
        B: { ...state.nodes.B, receive: { ...state.nodes.B.receive } }
      },
      packets: state.packets.map(packet => ({ ...packet })),
      events: [...state.events]
    };
  }

  function applyAction(state, action) {
    const next = copy(state);
    if (action.type === 'toggle-send') next.nodes[action.id].sending = action.value;
    if (action.type === 'toggle-read') next.nodes[action.id].reading = action.value;
    return next;
  }

  function step(state) {
    const next = copy(state);
    next.tick += 1;
    next.events = [];
    next.packets = [];
    const needsAck = { A: false, B: false };
    for (const id of ids) {
      const endpoint = next.nodes[id];
      endpoint.receive = { before: endpoint.rx, arrived: 0, buffered: endpoint.rx, read: 0 };
    }

    // All old segments arrive before either endpoint constructs its next segment.
    for (const packet of state.packets) {
      const receiver = next.nodes[packet.to];
      receiver.sndUna = Math.max(receiver.sndUna, packet.ack);
      receiver.peerRight = packet.ack + packet.win;
      if (packet.len > 0) {
        receiver.rcvNxt += packet.len;
        receiver.rx += packet.len;
        receiver.received += packet.len;
        receiver.receive.arrived += packet.len;
        needsAck[packet.to] = true;
        next.events.push(`${packet.to} 的 TCP 收到 ${packet.len} B，下一期待序号为 ${receiver.rcvNxt}。`);
      }
    }

    for (const id of ids) {
      const endpoint = next.nodes[id];
      endpoint.receive.buffered = endpoint.rx;
      if (endpoint.reading && endpoint.rx > 0) {
        const bytes = endpoint.rx;
        endpoint.receive.read = bytes;
        endpoint.delivered += bytes;
        endpoint.rx = 0;
        needsAck[id] = true;
        next.events.push(`${id} 的应用读取 ${bytes} B，释放接收缓冲空间。`);
      }
    }

    for (const id of ids) {
      const sender = next.nodes[id];
      const available = Math.max(0, sender.peerRight - sender.sndNxt);
      const len = sender.sending ? Math.min(constants.MSS, sender.queued, available) : 0;
      if (len === 0 && !needsAck[id]) continue;
      const packet = {
        from: id, to: opposite(id), seq: sender.sndNxt,
        ack: sender.rcvNxt, win: constants.CAPACITY - sender.rx, len
      };
      next.packets.push(packet);
      sender.sndNxt += len;
      sender.queued -= len;
      sender.sent += len;
      next.events.push(len > 0
        ? `${id}→${packet.to} 发送 ${len} B；SEQ=${packet.seq}，ACK=${packet.ack}，WIN=${packet.win} B。`
        : `${id}→${packet.to} 发送纯 ACK / 窗口更新；ACK=${packet.ack}，WIN=${packet.win} B（不消耗序号）。`);
    }
    return next;
  }

  function derive(state) {
    const result = {};
    for (const id of ids) {
      const endpoint = state.nodes[id];
      const flight = endpoint.sndNxt - endpoint.sndUna;
      const available = Math.max(0, endpoint.peerRight - endpoint.sndNxt);
      result[id] = {
        flight, available, sendBuffer: endpoint.queued + flight,
        window: constants.CAPACITY - endpoint.rx,
        blocked: endpoint.sending && endpoint.queued > 0 && available === 0
      };
    }
    const a = state.nodes.A;
    const b = state.nodes.B;
    result.summary = `第 ${state.tick} 步：A→B 已发送 ${a.sent} B，B→A 已发送 ${b.sent} B。`
      + `B 的接收缓冲占用 ${b.rx} / ${constants.CAPACITY} B。`
      + (result.A.blocked ? 'A 当前没有可发送新数据的窗口。' : '')
      + (result.B.blocked ? 'B 当前没有可发送新数据的窗口。' : '');
    return result;
  }

  return { constants, initialState, applyAction, step, derive };
});
