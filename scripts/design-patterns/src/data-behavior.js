/* Original teaching scenarios; coordinates are diagram positions, not memory addresses. */
(() => {
  const n = (id, label, sub, x, y, tone = 'neutral', w = 128) => ({ id, label, sub, x, y, z: 0, w, h: 58, tone });
  const e = (from, to, label = '') => ({ from, to, label });
  const f = (title, description, nodes, edges, active, stats, log) => ({ title, description, nodes, edges, active, stats: Object.entries(stats).map(([label, value]) => ({ label, value: String(value) })), log });
  const demo = (metaphor, caveat, variants) => ({ kind: '2d', metaphor, caveat, variants });

  function approval(amount) {
    const chain = [n('staff', '组长', '额度 ≤ 500', 180, 210), n('manager', '经理', '额度 ≤ 2,000', 400, 210), n('director', '总监', '额度 ≤ 5,000', 620, 210)];
    const handled = amount <= 500 ? 0 : 2;
    return {
      label: `报销 ¥${amount.toLocaleString()}`,
      frames: [
        f('请求进入链头', `报销 ${amount} 元；调用方只提交给组长，不指定最终处理人。`, [n('request', '报销单', `¥${amount.toLocaleString()}`, 180, 85, 'accent'), ...chain], [e('request', 'staff', 'handle')], ['request'], { '已检查': 0, '已批准': 0 }, 'client → staff.handle(amount)'),
        f('只从第一个处理者开始', '链中每个节点只了解自身条件和下一个节点；调用方不做额度分流。', chain, [e('staff', 'manager', 'next'), e('manager', 'director', 'next')], ['staff'], { '已检查': 0, '已批准': 0 }, 'staff.next = manager; manager.next = director'),
        ...chain.slice(0, handled + 1).map((node, i) => {
          const accepted = i === handled;
          return f(accepted ? `${node.label}处理并终止` : `${node.label}向后转交`, accepted ? `额度足够，${node.label}完成审批，后续节点不再处理。` : `额度不足；当前节点把同一请求交给下一节点。`, chain, chain.slice(1, i + (accepted ? 1 : 2)).map((v, j) => e(chain[j].id, v.id, 'next')), [node.id], { '已检查': i + 1, '已批准': accepted ? 1 : 0 }, accepted ? `${node.id}: approved(${amount}); return` : `${node.id}: next.handle(${amount})`);
        })
      ]
    };
  }

  function command(undo) {
    const nodes = [n('invoker', '按钮 / Invoker', '只认识 execute()', 150, 200), n('cmd', 'Insert 命令', 'receiver + text', 400, 200, 'blue'), n('doc', '文档 / Receiver', '真正修改文字', 650, 200)];
    return { label: undo ? '执行后撤销' : '排队后依次执行', frames: [
      f('把请求封装为对象', 'Insert 保存接收者和要插入的文本；创建命令时尚未执行。', nodes, [e('invoker', 'cmd', '持有')], ['cmd'], { '文档内容': '空', '已执行': 0 }, 'command = Insert(document, "A")'),
      f(undo ? '统一入口执行' : '命令先进入队列', undo ? '调用者只调用 execute；命令再调用文档的方法。' : '两个命令可以先保存，稍后由同一调用者触发。', undo ? nodes : [...nodes, n('cmd2', 'Insert("B")', '第二个请求', 400, 330, 'blue')], undo ? [e('invoker', 'cmd', 'execute'), e('cmd', 'doc', 'append A')] : [e('invoker', 'cmd', 'queue[0]'), e('invoker', 'cmd2', 'queue[1]')], undo ? ['cmd', 'doc'] : ['cmd', 'cmd2'], { '文档内容': undo ? 'A' : '空', '已执行': undo ? 1 : 0 }, undo ? 'command.execute() → document.text = "A"' : 'queue = [Insert(doc, "A"), Insert(doc, "B")]'),
      f(undo ? '命令显式恢复旧值' : '队列顺序成为执行顺序', undo ? 'undo 恢复 execute 之前保存的文字。撤销能力需要命令自行实现。' : '依次执行两个请求，文档得到 AB；接收者不需要知道队列。', nodes.map(v => v.id === 'doc' ? { ...v, sub: undo ? '内容恢复为空' : '当前内容：AB', tone: 'accent' } : v), [e('invoker', 'cmd', undo ? 'undo' : 'execute × 2'), e('cmd', 'doc', undo ? 'restore' : 'append')], ['doc'], { '文档内容': undo ? '空' : 'AB', '已执行': undo ? 1 : 2 }, undo ? 'command.undo() → document.text = before' : 'for command in queue: command.execute()')
    ] };
  }

  function expression(multiply) {
    const value = multiply ? 14 : 5;
    const nodes = [n('add', 'Add', '+', 400, 90, 'blue'), n('two', 'Number(2)', '终结符', 220, 230), ...(multiply ? [n('mul', 'Multiply', '×', 570, 230, 'blue'), n('three', 'Number(3)', '终结符', 470, 355), n('four', 'Number(4)', '终结符', 680, 355)] : [n('three', 'Number(3)', '终结符', 570, 230)])];
    const edges = [e('add', 'two', 'left'), e('add', multiply ? 'mul' : 'three', 'right'), ...(multiply ? [e('mul', 'three', 'left'), e('mul', 'four', 'right')] : [])];
    return { label: multiply ? '2 + (3 × 4)' : '2 + 3', frames: [
      f('先表示语法结构', '每种语法规则对应一种表达式对象；树的层级表示组合关系。', nodes, edges, ['add'], { '最终结果': '待求值' }, multiply ? 'Add(Number(2), Multiply(Number(3), Number(4)))' : 'Add(Number(2), Number(3))'),
      f('递归解释子表达式', multiply ? 'Add 先得到左值 2，再递归解释 Multiply；后者得到 3 × 4 = 12。' : '两个 Number 直接返回自身的数值 2 和 3。', nodes, edges, multiply ? ['mul', 'three', 'four'] : ['two', 'three'], { '左值': 2, '右值': multiply ? 12 : 3 }, multiply ? 'Multiply.interpret() = 3 * 4 = 12' : 'Number.interpret() → 2, 3'),
      f('父规则合并结果', `根节点执行加法并返回 ${value}；增加语法规则会增加相应的表达式类。`, nodes.map(v => v.id === 'add' ? { ...v, sub: `结果 = ${value}`, tone: 'accent' } : v), edges, ['add'], { '最终结果': value }, `Add.interpret() = 2 + ${multiply ? 12 : 3} = ${value}`)
    ] };
  }

  function iteration(reverse) {
    const order = reverse ? ['C', 'B', 'A'] : ['A', 'B', 'C'];
    const items = [n('a', 'A', '集合元素', 220, 150), n('b', 'B', '集合元素', 400, 150), n('c', 'C', '集合元素', 580, 150)];
    return { label: reverse ? '逆向迭代' : '正向迭代', frames: [
      f('创建独立游标', '遍历方式由迭代器封装；调用方使用同一种 next 协议。', [...items, n('cursor', 'Iterator', reverse ? '逆向游标' : '正向游标', 400, 310, 'blue')], [], ['cursor'], { '已返回': 0, '元素总数': 3 }, reverse ? 'iterator = reversed(collection)' : 'iterator = iter(collection)'),
      ...order.map((letter, index) => f(index === 2 ? '最后一个元素，然后结束' : `next → ${letter}`, `第 ${index + 1} 次 next 返回 ${letter}。${index === 2 ? '再调用一次将触发 StopIteration。' : '集合本身保持不变，游标向前推进。'}`, [...items, n('cursor', 'Iterator', `已返回 ${order.slice(0, index + 1).join(' → ')}`, 400, 310, 'blue', 220)], [e('cursor', letter.toLowerCase(), 'next')], [letter.toLowerCase()], { '已返回': index + 1, '元素总数': 3 }, `next(iterator) → "${letter}"${index === 2 ? '; next → StopIteration' : ''}`))
    ] };
  }

  function mediation(valid) {
    const nodes = [n('name', '姓名输入框', valid ? '值：小林' : '值：空', 170, 100), n('mail', '邮箱输入框', '值：有效邮箱', 170, 320), n('mediator', 'FormMediator', '协调表单规则', 410, 210, 'blue', 170), n('button', '提交按钮', valid ? '可启用' : '应禁用', 665, 210)];
    return { label: valid ? '字段完整' : '缺少姓名', frames: [
      f('组件只认识协调者', '输入框和按钮不直接相互调用；它们共享同一个中介者。', nodes, [e('name', 'mediator'), e('mail', 'mediator'), e('mediator', 'button')], ['mediator'], { '输入变化': 0, '按钮状态': '未计算' }, 'name.mediator = form; mail.mediator = form'),
      f('输入变化通知中介者', '任一输入变化都交给中介者；校验规则集中在协调者里。', nodes, [e('name', 'mediator', 'changed'), e('mail', 'mediator', 'changed')], ['name', 'mediator'], { '姓名有效': valid ? '是' : '否', '邮箱有效': '是' }, 'mediator.changed() → bool(name) and valid_email'),
      f('协调者更新按钮', valid ? '两个条件同时成立，中介者启用按钮。' : '即使邮箱有效，姓名为空仍使按钮禁用。', nodes.map(v => v.id === 'button' ? { ...v, sub: valid ? 'enabled = True' : 'enabled = False', tone: 'accent' } : v), [e('mediator', 'button', valid ? 'enable' : 'disable')], ['button'], { '按钮状态': valid ? '启用' : '禁用', '组件互调': 0 }, `button.enabled = ${valid ? 'True' : 'False'}`)
    ] };
  }

  function snapshot(late) {
    const nodes = [n('editor', 'Editor', '发起人：保存 / 恢复', 180, 210), n('snapshot', 'Memento', '封装内部状态', 410, 210, 'blue'), n('history', 'History', '管理快照引用', 650, 210)];
    const saved = late ? 'AB' : 'A';
    return { label: late ? '在 AB 时保存' : '在 A 时保存', frames: [
      f('选择保存时刻', `文档当前为 ${saved}。保存的时机决定以后能回到哪个版本。`, nodes.map(v => v.id === 'editor' ? { ...v, sub: `内容：${saved}` } : v), [], ['editor'], { '当前内容': saved, '保存点': '无' }, `editor.text = "${saved}"`),
      f('发起人生成快照', 'Editor 负责封装快照；History 只保存它，不读取或修改内部内容。', nodes, [e('editor', 'snapshot', 'save()'), e('snapshot', 'history', '保管引用')], ['snapshot', 'history'], { '当前内容': saved, '保存点': saved }, 'history.append(editor.save())'),
      f('继续编辑为 ABC', '当前状态改变，之前的快照保持不变。', nodes.map(v => v.id === 'editor' ? { ...v, sub: '内容：ABC' } : v), [], ['editor'], { '当前内容': 'ABC', '保存点': saved }, 'editor.text = "ABC"'),
      f('恢复到保存点', `由 Editor 读取自己的快照，恢复为 ${saved}；不是逐条执行操作的逆过程。`, nodes.map(v => v.id === 'editor' ? { ...v, sub: `内容：${saved}`, tone: 'accent' } : v), [e('history', 'snapshot', '取出'), e('snapshot', 'editor', 'restore')], ['editor'], { '当前内容': saved, '保存点': saved }, `editor.restore(history.pop()) → "${saved}"`)
    ] };
  }

  function observing(detach) {
    const nodes = [n('subject', 'Subject', '文章发布主题', 190, 210, 'blue', 145), n('mail', '邮件订阅者', 'update(event)', 590, 95), n('sms', '短信订阅者', 'update(event)', 590, 220), n('app', 'App 订阅者', detach ? '已取消订阅' : 'update(event)', 590, 345)];
    const ids = detach ? ['mail', 'sms'] : ['mail', 'sms', 'app'];
    return { label: detach ? 'App 取消订阅' : '保留三个订阅者', frames: [
      f('维护订阅关系', '主题保存观察者引用；观察者可以注册，也可以主动取消。', nodes, ids.map(id => e('subject', id, '已订阅')), ['subject'], { '订阅人数': ids.length, '本次收到': 0 }, detach ? 'subject.detach(app)' : 'subject.attach(mail, sms, app)'),
      f('主题发布一个变化', '主题遍历当前订阅列表，调用统一的 update 接口。', nodes, ids.map(id => e('subject', id, 'update')), ['subject'], { '订阅人数': ids.length, '本次收到': 0 }, 'subject.publish("新文章")'),
      f('当前观察者收到通知', detach ? '邮件与短信收到事件，App 不再收到；无需修改主题的发布逻辑。' : '同一个变化触发三个观察者。各观察者可自行决定如何响应。', nodes.map(v => ids.includes(v.id) ? { ...v, sub: '已收到：新文章', tone: 'accent' } : v), ids.map(id => e('subject', id, '已通知')), ids, { '订阅人数': ids.length, '本次收到': ids.length }, `${ids.join(', ')}.update("新文章")`)
    ] };
  }

  function stateMachine(blocked) {
    const nodes = [n('draft', 'Draft', '可编辑 / 可提交', 170, 200, 'blue'), n('review', 'Review', '等待审核', 400, 200, 'blue'), n('published', 'Published', '已发布', 630, 200, 'blue')];
    const transitions = [e('draft', 'review', 'submit'), e('review', 'published', 'approve')];
    return { label: blocked ? '草稿直接审核' : '提交后再审核', frames: [
      f('上下文持有当前状态', '同一个 approve 请求交给当前状态处理；起始状态是 Draft。', nodes, transitions, ['draft'], { '当前状态': 'Draft', '发布次数': 0 }, 'article.state = Draft()'),
      f(blocked ? 'Draft 拒绝 approve' : 'submit 改变当前状态', blocked ? '当前 Draft 不接受审核通过事件；状态保持 Draft。' : 'Draft.submit 把上下文的状态切换为 Review。', nodes.map(v => v.id === (blocked ? 'draft' : 'review') ? { ...v, tone: 'accent' } : v), transitions, [blocked ? 'draft' : 'review'], { '当前状态': blocked ? 'Draft' : 'Review', '发布次数': 0 }, blocked ? 'Draft.approve() → rejected; state unchanged' : 'Draft.submit(context) → context.state = Review()'),
      f(blocked ? '合法提交后进入 Review' : 'Review 接受 approve', blocked ? '随后执行 submit 才进入审核态。相同请求的效果取决于当前状态。' : 'Review.approve 切换为 Published；状态对象决定合法转换。', nodes.map(v => v.id === (blocked ? 'review' : 'published') ? { ...v, tone: 'accent' } : v), transitions, [blocked ? 'review' : 'published'], { '当前状态': blocked ? 'Review' : 'Published', '发布次数': blocked ? 0 : 1 }, blocked ? 'Draft.submit(context) → Review' : 'Review.approve(context) → Published')
    ] };
  }

  function strategy(express) {
    const cost = express ? 25 : 10;
    const nodes = [n('context', 'Checkout', '只调用 shipping(weight)', 190, 210, 'blue', 160), n('standard', '普通配送策略', '每公斤 ¥5', 480, 110), n('express', '加急配送策略', '每公斤 ¥10 + ¥5', 480, 310), n('result', '运费', `¥${cost}`, 690, 210, 'accent', 100)];
    return { label: express ? '选择加急配送' : '选择普通配送', frames: [
      f('外部选择策略', '相同包裹重 2 kg；调用方先决定本次使用哪一种可替换算法。', nodes, [e('context', express ? 'express' : 'standard', '注入')], [express ? 'express' : 'standard'], { '重量': '2 kg', '运费': '待计算' }, express ? 'checkout.shipping = express' : 'checkout.shipping = standard'),
      f('上下文委托算法', express ? '加急算法计算 2 × 10 + 5。' : '普通算法计算 2 × 5；结算流程不需要知道公式细节。', nodes, [e('context', express ? 'express' : 'standard', 'shipping(2)')], ['context', express ? 'express' : 'standard'], { '重量': '2 kg', '算法': express ? '加急' : '普通' }, express ? 'express(2) = 2 * 10 + 5' : 'standard(2) = 2 * 5'),
      f('同一接口，不同结果', `运费为 ¥${cost}；切换策略不会自动触发另一策略或改变上下文状态。`, nodes, [e(express ? 'express' : 'standard', 'result', `¥${cost}`)], ['result'], { '重量': '2 kg', '运费': `¥${cost}` }, `checkout.total_shipping(2) → ${cost}`)
    ] };
  }

  function template(csv) {
    const type = csv ? 'CSV' : 'JSON';
    const nodes = [n('read', 'read', '基类读取', 150, 210), n('parse', `parse_${type.toLowerCase()}`, '子类可变步骤', 400, 210, 'blue', 155), n('save', 'save', '基类保存', 650, 210)];
    return { label: `${type} 导入器`, frames: [
      f('模板固定步骤顺序', '基类 run 规定 read → parse → save；子类只覆盖解析步骤。', nodes, [e('read', 'parse'), e('parse', 'save')], ['read', 'parse', 'save'], { '已完成': '0 / 3', '输入类型': type }, 'Importer.run(): read(); parse(raw); save(rows)'),
      f('1 · 共用读取步骤', `读取一段 ${type} 文本，还没有解析成记录。`, nodes, [e('read', 'parse', 'raw')], ['read'], { '已完成': '1 / 3', '输入类型': type }, csv ? 'raw = "name\nAda"' : 'raw = \'[{"name": "Ada"}]\''),
      f('2 · 子类实现 parse', csv ? 'CSVImporter 把表头与数据行组成字典记录。' : 'JSONImporter 用 JSON 解析器得到字典列表。', nodes, [e('parse', 'save', 'rows')], ['parse'], { '已完成': '2 / 3', '记录数': 1 }, csv ? 'list(csv.DictReader(io.StringIO(raw)))' : 'json.loads(raw)'),
      f('3 · 回到共用保存步骤', '两种导入器都把同一种记录结构交给 save；算法骨架保持一致。', nodes.map(v => v.id === 'save' ? { ...v, sub: '保存 Ada 的记录', tone: 'accent' } : v), [e('read', 'parse'), e('parse', 'save')], ['save'], { '已完成': '3 / 3', '记录数': 1 }, 'save([{"name": "Ada"}])')
    ] };
  }

  function visiting(labelMode) {
    const nodes = [n('visitor', labelMode ? 'LabelVisitor' : 'TaxVisitor', labelMode ? '生成标签操作' : '计算税额操作', 170, 210, 'blue', 160), n('book', 'Book(100)', 'accept(visitor)', 430, 100), n('food', 'Food(100)', 'accept(visitor)', 430, 320), n('result', '操作结果', labelMode ? '图书 / 食品' : '5 + 10 = 15', 680, 210, 'accent', 140)];
    return { label: labelMode ? '生成品类标签' : '计算分类税额', frames: [
      f('固定元素，替换操作', 'Book 与 Food 的类不变，调用方选择要施加的访问者。', nodes, [e('visitor', 'book', 'accept'), e('visitor', 'food', 'accept')], ['visitor'], { '已访问': 0, '结果': '待计算' }, labelMode ? 'visitor = LabelVisitor()' : 'visitor = TaxVisitor()'),
      f('由元素选择对应入口', 'Book.accept 调用 visit_book(self)。先按元素选择入口，再执行当前访问者的实现。', nodes, [e('visitor', 'book', 'accept'), e('book', 'visitor', 'visit_book')], ['book', 'visitor'], { '已访问': 1, '结果': labelMode ? '图书' : '5' }, labelMode ? 'Book.accept(v) → v.visit_book(self) → "图书"' : 'Book.accept(v) → v.visit_book(self) → 100 * 0.05'),
      f('另一类元素走另一入口', 'Food.accept 调用 visit_food(self)。增加操作可增加访问者；增加元素类型则要修改访问者接口。', nodes, [e('food', 'visitor', 'visit_food'), e('visitor', 'result', '汇总')], ['food', 'result'], { '已访问': 2, '结果': labelMode ? '图书 / 食品' : '税额 15' }, labelMode ? 'Food.accept(v) → "食品"; results = ["图书", "食品"]' : 'Food.accept(v) → 10; total_tax = 5 + 10 = 15')
    ] };
  }

  window.BEHAVIOR_PATTERNS = [
    {
      id: 'chain-of-responsibility', name: '责任链', en: 'Chain of Responsibility', category: 'behavioral',
      intent: '把请求沿处理链传递，由能够处理的节点接手。',
      problem: '提交方不应写死审批人，处理规则和顺序却会随业务变化。',
      when: '分级审批、逐级匹配处理器；发送方无需知道最终接收者。',
      avoid: '每个步骤都必须执行且顺序固定时，普通流水线通常更直接。',
      tradeoff: '链顺序影响结果；请求可能无人处理，需要定义链尾语义。',
      compare: { id: 'decorator', name: '装饰器', difference: '责任链寻找处理者，节点可终止传递；装饰器层层叠加职责并委托被包装对象。' },
      code: `class Approver:
    def __init__(self, name, limit, next_handler=None):
        self.name, self.limit = name, limit
        self.next = next_handler

    def handle(self, amount):
        if amount <= self.limit:
            return self.name
        if self.next:
            return self.next.handle(amount)
        return "无人可审批"

director = Approver("总监", 5000)
manager = Approver("经理", 2000, director)
staff = Approver("组长", 500, manager)
print(staff.handle(400))   # 组长
print(staff.handle(4000))  # 总监
print(staff.handle(6000))  # 无人可审批`,
      demo: demo('报销单穿过审批链', '这里采用首个能处理者终止的链；某些责任链会让多个节点继续处理。额度是教学参数。', [approval(400), approval(4000)])
    },
    {
      id: 'command', name: '命令', en: 'Command', category: 'behavioral',
      intent: '把一次请求连同接收者和参数封装成对象。',
      problem: '按钮与业务操作绑在一起，就难以统一排队、记录或撤销。',
      when: '编辑器操作、任务队列、宏命令，需要把触发时机和执行逻辑分开。',
      avoid: '只是立即调用一个简单函数时，额外的命令类未必有收益。',
      tradeoff: '命令数量会增加；undo、重试与持久化都需要额外设计，不由模式自动提供。',
      compare: { id: 'strategy', name: '策略', difference: '命令代表一次带参数的请求；策略代表可替换的算法，通常会被上下文重复使用。' },
      code: `class Document:
    def __init__(self):
        self.text = ""

class Insert:
    def __init__(self, doc, text):
        self.doc, self.text = doc, text

    def execute(self):
        self.before = self.doc.text
        self.doc.text += self.text

    def undo(self):
        self.doc.text = self.before

doc = Document()
command = Insert(doc, "A")
command.execute()
print(doc.text)  # A
command.undo()
print(repr(doc.text))  # ''
queue = [Insert(doc, "A"), Insert(doc, "B")]
for command in queue:
    command.execute()
print(doc.text)  # AB`,
      demo: demo('可排队、可撤销的文档插入', 'undo 用执行前快照实现；只撤销最近一次且无并发修改的操作。外部不可逆动作不一定能撤销。', [command(true), command(false)])
    },
    {
      id: 'interpreter', name: '解释器', en: 'Interpreter', category: 'behavioral',
      intent: '用表达式对象表示语法规则，递归解释组合而成的句子。',
      problem: '业务规则像一门小语言，直接堆条件分支会难以组合和求值。',
      when: '语法简单且稳定的小型规则语言、表达式树。',
      avoid: '复杂通用语言应考虑成熟解析器；不要把不可信字符串交给 eval。',
      tradeoff: '每条规则往往对应一个类；语法复杂时类数量和解析成本都会上升。',
      compare: { id: 'composite', name: '组合', difference: '组合表达树形整体与部分；解释器常借助组合树，但额外定义语法规则和求值语义。' },
      code: `class Number:
    def __init__(self, value):
        self.value = value
    def interpret(self):
        return self.value

class Add:
    def __init__(self, left, right):
        self.left, self.right = left, right
    def interpret(self):
        return self.left.interpret() + self.right.interpret()

class Multiply(Add):
    def interpret(self):
        return self.left.interpret() * self.right.interpret()

simple = Add(Number(2), Number(3))
nested = Add(Number(2), Multiply(Number(3), Number(4)))
print(simple.interpret())  # 5
print(nested.interpret())  # 14`,
      demo: demo('沿语法树求值', '直接构造语法树，未实现字符串词法分析或解析器；树的层级已经明确运算关系。', [expression(false), expression(true)])
    },
    {
      id: 'iterator', name: '迭代器', en: 'Iterator', category: 'behavioral',
      intent: '通过统一接口顺序访问集合，而不暴露内部存储方式。',
      problem: '调用方直接依赖索引和存储结构，换成树或流时遍历代码就要重写。',
      when: '集合有多种遍历方式，或需要惰性产生元素、维护独立游标。',
      avoid: 'Python 的 for、生成器和内建迭代器已经够用时，优先直接使用。',
      tradeoff: '需要定义遍历期间修改集合的行为；一次性迭代器耗尽后不会自动重来。',
      compare: { id: 'visitor', name: '访问者', difference: '迭代器决定如何逐个取元素；访问者决定对不同类型元素执行什么操作。' },
      code: `class Shelf:
    def __init__(self, books):
        self._books = tuple(books)

    def __iter__(self):
        for book in self._books:
            yield book

    def __reversed__(self):
        for book in reversed(self._books):
            yield book

shelf = Shelf(["A", "B", "C"])
forward = iter(shelf)
backward = reversed(shelf)
print(list(forward))   # ['A', 'B', 'C']
print(list(backward))  # ['C', 'B', 'A']
print(list(forward))   # []，已经耗尽`,
      demo: demo('集合不动，游标改变访问顺序', '用固定集合展示正向与逆向遍历；不演示遍历中修改集合、并发或无限流。', [iteration(false), iteration(true)])
    },
    {
      id: 'mediator', name: '中介者', en: 'Mediator', category: 'behavioral',
      intent: '让多个组件通过一个协调者协作，减少彼此直接依赖。',
      problem: '表单中的输入框和按钮互相调用，组件数量一多就形成关系网。',
      when: '表单联动、对话框控件、参与者之间有明确的集中协调规则。',
      avoid: '独立组件之间没有协作规则时，不需要为了集中而集中。',
      tradeoff: '关系复杂性集中到中介者；规则过多会使它变成难维护的巨型对象。',
      compare: { id: 'observer', name: '观察者', difference: '中介者封装多方的协作规则；观察者传播一个主题的变化，通常不负责整体协调。' },
      code: `class Field:
    def __init__(self, mediator):
        self.mediator, self.value = mediator, ""
    def set(self, value):
        self.value = value
        self.mediator.changed()

class Button:
    enabled = False

class FormMediator:
    def __init__(self):
        self.name, self.email = Field(self), Field(self)
        self.button = Button()
    def changed(self):
        self.button.enabled = bool(self.name.value) and (
            "@" in self.email.value)

form = FormMediator()
form.email.set("ada@example.test")
print(form.button.enabled)  # False
form.name.set("Ada")
print(form.button.enabled)  # True`,
      demo: demo('输入组件通过表单协调者更新按钮', '邮箱校验仅用 @ 示意业务条件，不是完整校验器；中介者不等同网络消息代理。', [mediation(false), mediation(true)])
    },
    {
      id: 'memento', name: '备忘录', en: 'Memento', category: 'behavioral',
      intent: '在保持封装的前提下保存对象状态，供以后恢复。',
      problem: '历史管理器需要撤回状态，却不应掌握对象内部所有字段。',
      when: '编辑器快照、游戏存档、对象状态回滚。',
      avoid: '状态很大且变化很频繁时，完整快照可能比增量操作记录更昂贵。',
      tradeoff: '占用存储；快照必须独立于后续修改，还要定义保存粒度与保留期限。',
      compare: { id: 'command', name: '命令', difference: '备忘录保存“当时是什么”；命令保存“要做什么”。命令的撤销也可以借助备忘录。' },
      code: `from dataclasses import dataclass

@dataclass(frozen=True)
class _Snapshot:
    _text: str

class Editor:
    def __init__(self, text):
        self.text = text
    def save(self):
        return _Snapshot(self.text)
    def restore(self, snapshot):
        self.text = snapshot._text

for saved_text in ("A", "AB"):
    editor = Editor(saved_text)
    history = [editor.save()]  # 仅保管，不检查字段
    editor.text = "ABC"
    editor.restore(history.pop())
    print(editor.text)  # A，然后 AB`,
      demo: demo('同一次恢复，取决于保存时刻', '以不可变字符串快照示意封装；Python 下划线是访问约定。可变嵌套状态要额外处理复制。', [snapshot(false), snapshot(true)])
    },
    {
      id: 'observer', name: '观察者', en: 'Observer', category: 'behavioral',
      intent: '主题变化时，通知当前注册的多个观察者。',
      problem: '新增通知渠道不应迫使主题依赖每一种具体接收者。',
      when: 'UI 数据绑定、领域事件、同一变化需要触发多种独立响应。',
      avoid: '只有一个固定调用目标时，直接调用更清楚；需要可靠投递时应另设计消息机制。',
      tradeoff: '要管理订阅生命周期、防止重复订阅和通知环；通知顺序、异步性与失败隔离需显式约定。',
      compare: { id: 'mediator', name: '中介者', difference: '观察者强调一对多变化通知；中介者集中封装多个参与者之间的协作规则。' },
      code: `class Subject:
    def __init__(self):
        self.observers = []
    def attach(self, observer):
        self.observers.append(observer)
    def detach(self, observer):
        self.observers.remove(observer)
    def publish(self, event):
        for observer in tuple(self.observers):
            observer.update(event)

class Subscriber:
    def __init__(self, name):
        self.name = name
    def update(self, event):
        print(self.name, event)

subject = Subject()
mail, sms, app = [Subscriber(n) for n in ("邮件", "短信", "App")]
for observer in (mail, sms, app):
    subject.attach(observer)
subject.publish("第一篇文章")  # 三个接收者
subject.detach(app)
subject.publish("第二篇文章")  # 邮件、短信`,
      demo: demo('文章发布触发当前订阅者', '经典直接通知的观察者模型；箭头不表示并行或可靠投递，也不把所有异步 Pub/Sub 等同此模式。', [observing(false), observing(true)])
    },
    {
      id: 'state', name: '状态', en: 'State', category: 'behavioral',
      intent: '把与状态有关的行为交给状态对象，让同一请求产生不同反应。',
      problem: '对象每个方法都在重复检查 status，合法转换规则散落在条件分支里。',
      when: '订单、文档、播放器等有清晰状态和转换规则的对象。',
      avoid: '只有少量稳定状态且行为简单时，枚举加条件判断可能更易读。',
      tradeoff: '增加状态类；必须明确谁负责转换，避免上下文和状态对象互相争夺规则。',
      compare: { id: 'strategy', name: '策略', difference: '状态描述对象当前所处阶段，事件可推动内部转换；策略通常由外部选择可替换算法。' },
      code: `class Draft:
    name = "Draft"
    def handle(self, context, event):
        if event == "submit":
            context.state = Review()

class Review:
    name = "Review"
    def handle(self, context, event):
        if event == "approve":
            context.state = Published()

class Published:
    name = "Published"
    def handle(self, context, event):
        pass

class Article:
    def __init__(self):
        self.state = Draft()
    def send(self, event):
        self.state.handle(self, event)
        print(self.state.name)

article = Article()
article.send("approve")  # Draft，不接受此事件
article.send("submit")   # Review
article.send("approve")  # Published`,
      demo: demo('稿件由当前状态决定能否审核', '仅演示三种状态和两个事件；转换规则是示例业务，并非状态模式要求的固定流程。', [stateMachine(false), stateMachine(true)])
    },
    {
      id: 'strategy', name: '策略', en: 'Strategy', category: 'behavioral',
      intent: '把同一任务的不同算法封装起来，由上下文按统一接口使用。',
      problem: '配送或计价算法不断增加，结算流程被越来越多分支打断。',
      when: '多种可互换的计费、排序、压缩或路径算法，需要独立选择和测试。',
      avoid: '算法只有一种或只是简单参数差异时，参数或函数往往已经足够。',
      tradeoff: '调用方需要了解算法差异；在 Python 中策略可直接使用函数，不必强建类层次。',
      compare: { id: 'template-method', name: '模板方法', difference: '策略通过组合替换算法；模板方法通过继承替换固定骨架中的步骤。' },
      code: `def standard(weight):
    return weight * 5

def express(weight):
    return weight * 10 + 5

class Checkout:
    def __init__(self, shipping):
        self.shipping = shipping
    def total_shipping(self, weight):
        return self.shipping(weight)

checkout = Checkout(standard)
print(checkout.total_shipping(2))  # 10
checkout.shipping = express
print(checkout.total_shipping(2))  # 25`,
      demo: demo('同一个结算流程，换一种运费算法', '价格为教学参数；展示函数作为策略，算法选择与页面中的“状态模式”业务转换不同。', [strategy(false), strategy(true)])
    },
    {
      id: 'template-method', name: '模板方法', en: 'Template Method', category: 'behavioral',
      intent: '在基类固定算法骨架，把可变步骤留给子类实现。',
      problem: '多个导入器重复相同流程，只有解析方式存在差异。',
      when: '处理步骤和顺序稳定，但少数步骤会随具体类型变化。',
      avoid: '步骤组合经常在运行时改变时，组合或策略通常更灵活。',
      tradeoff: '子类与基类骨架耦合；子类不应随意覆盖模板方法来破坏顺序。',
      compare: { id: 'strategy', name: '策略', difference: '模板方法把变化点留在继承层次；策略把算法作为对象或函数注入上下文。' },
      code: `import csv
import io
import json
from abc import ABC, abstractmethod

class Importer(ABC):
    def run(self, raw):
        data = self.read(raw)
        rows = self.parse(data)
        return self.save(rows)
    def read(self, raw):
        return raw
    @abstractmethod
    def parse(self, data):
        pass
    def save(self, rows):
        return rows

class JSONImporter(Importer):
    def parse(self, data):
        return json.loads(data)

class CSVImporter(Importer):
    def parse(self, data):
        return list(csv.DictReader(io.StringIO(data)))

print(JSONImporter().run('[{"name":"Ada"}]'))
print(CSVImporter().run("name\\nAda"))
# 两次都是 [{'name': 'Ada'}]`,
      demo: demo('导入器共享骨架，仅替换解析步骤', 'read 和 save 在最小示例中只返回数据，不做真实文件或数据库操作；骨架顺序可直接检查。', [template(false), template(true)])
    },
    {
      id: 'visitor', name: '访问者', en: 'Visitor', category: 'behavioral',
      intent: '把对一组元素类型的操作放进访问者，通过 accept 分派到对应操作。',
      problem: '元素类型稳定，但不断新增计税、导出等操作，不想反复改元素类。',
      when: '稳定的语法树、文档节点或商品类型，需要经常添加跨类型操作。',
      avoid: '元素种类经常增加时，每次都要同步修改所有访问者，维护成本很高。',
      tradeoff: '访问者需要元素暴露足够信息；增加操作容易，增加元素类型较难。',
      compare: { id: 'iterator', name: '迭代器', difference: '迭代器负责取出元素；访问者利用元素的具体类型选择操作，两者可以一起使用。' },
      code: `class Book:
    def __init__(self, price):
        self.price = price
    def accept(self, visitor):
        return visitor.visit_book(self)

class Food:
    def __init__(self, price):
        self.price = price
    def accept(self, visitor):
        return visitor.visit_food(self)

class TaxVisitor:
    def visit_book(self, book):
        return book.price * 0.05
    def visit_food(self, food):
        return food.price * 0.10

class LabelVisitor:
    def visit_book(self, book):
        return "图书"
    def visit_food(self, food):
        return "食品"

items = [Book(100), Food(100)]
print(sum(item.accept(TaxVisitor()) for item in items))  # 15.0
print([item.accept(LabelVisitor()) for item in items])  # ['图书', '食品']`,
      demo: demo('相同元素，施加不同访问操作', 'Python 用显式 visit_book / visit_food 表达两次分派；不是依赖语言的函数重载。税率为教学参数。', [visiting(false), visiting(true)])
    }
  ];
})();
