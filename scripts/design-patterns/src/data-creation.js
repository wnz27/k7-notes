/* Original teaching examples. */
(() => {
  const n = (id, label, sub, x, y, tone = 'neutral', z = 0, size = {}) => ({id, label, sub, x, y, z, tone, ...size});
  const e = (from, to, label = '') => ({from, to, label});
  const f = (title, description, active, nodes, edges, stats, log) => ({title, description, active, nodes, edges, stats: stats.map(([label,value]) => ({label, value: String(value)})), log});
  const item = (id,name,en,category,intent,problem,when,avoid,tradeoff,compare,code,demo) => ({id,name,en,category,intent,problem,when,avoid,tradeoff,compare,code,demo});
  const singleton = multiple => {
    const clients = [n('a','调用方 A','get_instance()',150,115),n('b','调用方 B','get_instance()',150,275)];
    const first = n('one','实例 #1','配置中心',580,115,'accent');
    const second = n('two','实例 #2','配置中心',580,275,'blue');
    return {label: multiple ? '对照：每次新建' : '共享同一实例', frames: [
      f('先预测对象数量','两个调用方先后请求配置对象。两次调用会创建几个对象？',['a','b'],clients,[],[['请求数',0],['实例数',0]],'等待 A 发起请求'),
      f('首次请求','A 请求时对象不存在，先创建实例 #1。',['a','one'],[...clients,first],[e('a','one','创建')],[['请求数',1],['实例数',1]],'A → 创建 #1'),
      f('第二次请求',multiple ? '普通构造再次创建实例 #2，A 和 B 的引用不同。' : '缓存已存在，B 直接得到 #1，A 和 B 指向同一个对象。',multiple ? ['b','two'] : ['b','one'],[...clients,first,...(multiple?[second]:[])],[e('a','one'),e('b',multiple?'two':'one',multiple?'创建':'复用')],[['请求数',2],['实例数',multiple?2:1],['A is B',multiple?'False':'True']],multiple?'B → 创建 #2；A is B = False':'B → 复用 #1；A is B = True')
    ]};
  };
  const factory = (isMethod,latte) => {
    const product = latte ? '拿铁' : '美式';
    const type = latte ? 'Latte' : 'Americano';
    const nodes = [n('client','客户端','只使用 brew()',130,205),n('creator',isMethod ? `${product}店` : '咖啡工厂',isMethod?'覆写 create()':'按 kind 分支',395,205,'blue'),n('product',product,type,660,205,'accent')];
    return {label: `${isMethod?'使用':'选择'}${product}`, frames:[
      f('提出需求',isMethod?'客户端持有具体店铺，但复用父类的 serve() 工作流程。':'客户端提供产品类型，构造细节集中在工厂函数。',['client'],nodes.slice(0,2),[e('client','creator')],[['目标产品',product],['已创建',0]],isMethod?`选择 ${type}Shop`:`make_coffee('${latte?'latte':'americano'}')`),
      f(isMethod?'子类决定产品':'工厂选择产品',isMethod?'父类调用工厂方法，具体子类返回对应产品。':'工厂根据参数，定位对应的产品构造器。',['creator','product'],nodes,[e('client','creator'),e('creator','product','创建')],[['目标产品',product],['已创建',1]],isMethod?`${type}Shop.create() → ${type}()`:`kind → ${type}()`),
      f('通过统一接口使用','调用方使用 brew()，不用再关心产品构造细节。',['product'],nodes,[e('client','creator'),e('creator','product','brew()')],[['返回结果',`${product}已煮好`],['已创建',1]],`${type}.brew() → ${product}已煮好`)
    ]};
  };
  const family = dark => {
    const theme = dark?'深色':'浅色';
    const nodes=[n('client','客户端','create_ui(factory)',115,205,'neutral',0,{w:145}),n('factory',`${theme}工厂`,'一组创建方法',365,205,'accent'),n('button',`${theme}按钮`,'Button',645,115,'blue'),n('menu',`${theme}菜单`,'Menu',645,295,'blue')];
    return {label:`${theme}产品族`,frames:[
      f('选择一个产品族','把一个具体工厂交给客户端；按钮和菜单来自同一主题族。',['factory'],nodes.slice(0,2),[e('client','factory')],[['主题',theme],['产品数',0]],`注入 ${dark?'Dark':'Light'}Factory`),
      f('创建第一类产品','工厂的 button() 创建当前主题的按钮。',['factory','button'],nodes.slice(0,3),[e('client','factory'),e('factory','button','button()')],[['主题',theme],['产品数',1]],`${theme}工厂 → ${theme}按钮`),
      f('创建配套产品','同一工厂的 menu() 返回配套菜单；产品族变化时替换整个工厂。',['menu'],nodes,[e('client','factory'),e('factory','button','button()'),e('factory','menu','menu()')],[['主题',theme],['产品数',2],['配套一致','是']],`${theme}按钮 + ${theme}菜单；客户端流程不变`)
    ]};
  };
  const builder = deluxe => {
    const parts=[n('bread','面包','基础层',0,0,'blue',0,{w:175,h:32,d:100}),n('cheese','芝士','第二步',0,50,'accent',0,{w:175,h:28,d:100}),n('tomato','番茄','第三步',0,100,'accent',0,{w:175,h:28,d:100})];
    const ingredients=parts.map((part,i)=>({...part,x:(i-1)*190,y:0,w:125,d:85,sub:i===2?'可选 · 待加入':'待加入'}));
    const total = deluxe?3:2;
    return {label:deluxe?'三层套餐':'两层套餐',frames:[
      f('先选择构建方案','桌面是尚未加入成品的原料；Builder 此时为空。调用方决定按配方加入哪几层。',[],ingredients,[],[['已添加',0],['目标层数',total]],'原料已备好；builder = SandwichBuilder()'),
      ...parts.slice(0,total).map((part,i)=>f(`添加${part.label}`,`第 ${i+1} 步把${part.label}加入当前产品；同一个构建器可以选择不同配方。`,[part.id],parts.slice(0,i+1),[],[['已添加',i+1],['目标层数',total]],`add('${part.label}') → [${parts.slice(0,i+1).map(p=>p.label).join(', ')}]`)),
      f('取出完成品','build() 返回完整产品的副本，并重置构建器，避免下一次继续使用旧内容。',parts.slice(0,total).map(p=>p.id),parts.slice(0,total),[],[['成品层数',total],['构建器已重置','是']],`build() → ${parts.slice(0,total).map(p=>p.label).join(' + ')}`)
    ]};
  };
  const prototype = deep => {
    const nodes=[n('original','原对象','tags: [草稿]',160,120),n('clone','复制对象','clone()',160,290,'blue'),n('list','标签列表 #1','[草稿]',590,120,'accent'),...(deep?[n('list2','标签列表 #2','[草稿]',590,290,'blue')]:[])];
    return {label:deep?'深复制 deepcopy':'浅复制 copy',frames:[
      f('读取原型','已有文档包含一个可变的嵌套列表 tags。',['original','list'],[nodes[0],nodes[2]],[e('original','list')],[['顶层对象',1],['标签列表',1]],'original.tags = [草稿]'),
      f('从原型复制',deep?'递归复制嵌套列表，副本得到独立的标签列表。':'仅创建新的顶层对象，嵌套标签列表仍被共享。',['clone',deep?'list2':'list'],nodes,[e('original','list'),e('clone',deep?'list2':'list')],[['顶层对象',2],['标签列表',deep?2:1]],deep?'deepcopy(original) → 独立嵌套列表':'copy(original) → 共享嵌套列表'),
      f('修改副本标签',deep?'向副本追加“已审”；原型标签仍然只有“草稿”。':'副本追加“已审”时，两个对象都看到共享列表发生变化。',deep?['clone','list2']:['original','clone','list'],nodes.map(p=>p.id===(deep?'list2':'list')?{...p,sub:'[草稿, 已审]'}:p),[e('original','list'),e('clone',deep?'list2':'list')],[['原型标签',deep?'草稿':'草稿, 已审'],['副本标签','草稿, 已审']],deep?'副本变化；原型不变':'共享引用：原型与副本同时观察到变化')
    ]};
  };
  const adapter = adapted => {
    const nodes=[n('client','新客户端','期待 send(text)',125,205),n('adapter','适配器','send → push',390,205,'accent'),n('legacy','旧接口','只有 push(text)',665,205,'blue')];
    return {label:adapted?'接入适配器':'对照：直接调用',frames:[
      f('发现接口不匹配','新客户端调用 send()，旧库只暴露 push()。',['client','legacy'],adapted?nodes:[nodes[0],nodes[2]],[],[['目标方法','send()'],['旧库方法','push()']],'客户端和旧库的方法名不同'),
      f(adapted?'转换调用':'方法不存在',adapted?'对象适配器持有旧库对象，将 send(text) 转发成 push(text)。':'直接向旧对象调用 send() 会找不到方法；数据还没有送出。',adapted?['adapter']:['legacy'],adapted?nodes:[nodes[0],nodes[2]],adapted?[e('client','adapter','send()'),e('adapter','legacy','push()')]:[e('client','legacy','send() ×')],[['接口兼容',adapted?'是':'否'],['送达消息',0]],adapted?'Adapter.send(text) → Legacy.push(text)':'AttributeError: send'),
      f('观察结果',adapted?'客户端仍使用自己的目标接口，旧库代码不用改。':'缺少适配器时不能完成本次目标接口调用。',adapted?['legacy']:['client'],adapted?nodes:[nodes[0],nodes[2]],adapted?[e('client','adapter'),e('adapter','legacy')]:[],[['送达消息',adapted?1:0],['修改旧库','无需']],adapted?'push(订单已创建) → 已送达':'没有消息送达')
    ]};
  };
  const bridge = email => {
    const impl=email?'邮件':'短信';
    const nodes=[n('notice','紧急通知','抽象：urgent()',145,205,'accent'),n('channel','发送接口','实现：send(text)',410,205,'blue'),n('sms',`${impl}通道`,email?'EmailSender':'SmsSender',675,205)];
    return {label:`紧急通知 × ${impl}`,frames:[
      f('拆开两个变化维度','通知级别与发送通道分别定义，通过组合连接，而不是为每种组合创建子类。',['notice','channel'],nodes.slice(0,2),[e('notice','channel','持有实现')],[['通知级别','紧急'],['发送通道',impl]],'UrgentNotice(sender)'),
      f('注入具体实现','切换通道只替换 Sender；通知级别的封装逻辑保持不变。',['channel','sms'],nodes,[e('notice','channel'),e('channel','sms','委托')],[['通知级别','紧急'],['发送通道',impl]],`sender = ${email?'EmailSender':'SmsSender'}()`),
      f('跨桥调用','通知抽象加上“紧急”前缀，具体实现负责实际发送。',['notice','sms'],nodes,[e('notice','channel','send()'),e('channel','sms','发送')],[['送达通道',impl],['消息','[紧急] 服务异常']],`${impl}: [紧急] 服务异常`)
    ]};
  };
  const composite = nested => {
    const nodes=[n('root','订单','Group',-10,165,'blue',-90,{w:110,h:36,d:65}),n('a','咖啡','¥20',120,90,'accent',-60,{w:100,h:35,d:65}),n('b',nested?'套餐':'蛋糕',nested?'Group':'¥30',5,70,'blue',-25,{w:100,h:35,d:65}),...(nested?[n('c','蛋糕','¥30',0,-5,'accent',65,{w:100,h:35,d:60}),n('d','饼干','¥10',-70,25,'accent',20,{w:90,h:35,d:60})]:[])];
    const edges=[e('root','a'),e('root','b'),...(nested?[e('b','c'),e('b','d')]:[])];
    return {label:nested?'嵌套套餐：¥60':'平铺订单：¥50',frames:[
      f('先预测汇总结果','订单与单品都提供 total()，客户端不用逐个判断是否为容器。',['root'],nodes,edges,[['层级',nested?3:2],['合计','待计算']],'order.total()'),
      f('递归委托给子项',nested?'根订单调用单品和套餐的 total()，套餐再向下委托。':'根订单分别向咖啡和蛋糕委托 total()。',nested?['a','b','c','d']:['a','b'],nodes,edges,[['单品数',nested?3:2],['合计','计算中']],nested?'20 + (30 + 10)':'20 + 30'),
      f('统一返回合计','叶节点返回自身金额，容器返回子项金额之和，任意深度遵守同一接口。',['root'],nodes.map(p=>p.id==='root'?{...p,sub:`¥${nested?60:50}`} :p),edges,[['单品数',nested?3:2],['合计',`¥${nested?60:50}`]],`total() = ${nested?60:50}`)
    ]};
  };
  const decorator = twice => {
    const nodes=[n('base','咖啡','cost() = 20',0,0,'blue',0,{w:160,h:36,d:100}),n('milk','加奶层','委托 + 5',0,55,'accent',0,{w:180,h:30,d:115}),...(twice?[n('sugar','加糖层','委托 + 2',0,110,'accent',0,{w:200,h:30,d:130})]:[])];
    return {label:twice?'咖啡 + 奶 + 糖':'咖啡 + 奶',frames:[
      f('叠加包装器','各层都暴露 cost()，外层持有内层；这里的分层表示调用嵌套。',[twice?'sugar':'milk'],nodes,[],[['基础价格',20],['附加层',twice?2:1]],twice?'Sugar(Milk(Coffee()))':'Milk(Coffee())'),
      f('从外向内委托','外层先调用内层，最终到达原始咖啡对象。',['base'],nodes,twice?[e('sugar','milk','cost()'),e('milk','base','cost()')]:[e('milk','base','cost()')],[['当前返回',20],['委托方向','外 → 内']],'Coffee.cost() → 20'),
      f('从内向外增强','内层结果逐层返回，每个包装器增加自己的行为或费用。',twice?['milk','sugar']:['milk'],nodes,twice?[e('base','milk','20 + 5'),e('milk','sugar','25 + 2')]:[e('base','milk','20 + 5')],[['最终价格',twice?27:25],['返回方向','内 → 外']],twice?'20 → 25 → 27':'20 → 25')
    ]};
  };
  const facade = stop => {
    const nodes=[n('client','客户端',stop?'stop()':'watch()',110,205),n('facade','影院门面','协调多个子系统',350,205,'accent'),n('light','灯光',stop?'开启':'调暗',650,85,'blue'),n('screen','屏幕',stop?'收起':'展开',650,205,'blue'),n('player','播放器',stop?'停止':'播放',650,325,'blue')];
    return {label:stop?'结束观影':'开始观影',frames:[
      f('一个面向任务的入口','客户端把完整用例交给门面，不必知道每个子系统的调用细节。',['client','facade'],nodes,[e('client','facade')],[['客户端调用',1],['已协调子系统',0]],stop?'cinema.stop()':'cinema.watch()'),
      f('门面协调子系统','门面根据任务按顺序调用播放器、屏幕、灯光；它们仍可独立使用。',stop?['player','screen']:['light','screen'],nodes,[e('client','facade'),e('facade','light'),e('facade','screen'),e('facade','player')],[['客户端调用',1],['已协调子系统',2]],stop?'player.stop() → screen.up()':'light.dim() → screen.down()'),
      f('用例完成','门面简化了入口和调用顺序，没有替代子系统自身的职责。',['light','screen','player'],nodes,[e('client','facade'),e('facade','light'),e('facade','screen'),e('facade','player')],[['客户端调用',1],['已协调子系统',3],['影院状态',stop?'空闲':'观影中']],stop?'light.on() → 结束':'player.play() → 开始观影')
    ]};
  };
  const flyweight = shared => {
    const pool = n('style','样式 #1','字形 A · 字体 Serif',0,125,'accent',-50,{w:175,h:40,d:70});
    const glyphs=[n('a','位置 (0,0)','字符上下文',-180,0,'blue',60,{w:115,h:36,d:65}),n('b','位置 (1,0)','字符上下文',0,0,'blue',60,{w:115,h:36,d:65}),n('c','位置 (2,0)','字符上下文',180,0,'blue',60,{w:115,h:36,d:65})];
    const styles=shared?[pool]:[...glyphs.map((g,i)=>n(`s${i}`,`样式 #${i+1}`,'A · Serif',g.x,125,'accent',-50,{w:115,h:36,d:65}))];
    const links=glyphs.map((g,i)=>e(g.id,shared?'style':`s${i}`,'引用'));
    return {label:shared?'共享内在样式':'对照：重复样式',frames:[
      f('区分状态','字符 A 和字体是可共享的内在状态；每次出现的位置是独立的外部状态。',glyphs.map(g=>g.id),glyphs,[],[['字符出现次数',3],['已建样式',0]],'同一字形 A 出现在三个位置'),
      f(shared?'命中样式池':'每次重新创建',shared?'按 (字符, 字体) 查询池，三次请求复用一个不可变样式对象。':'没有样式池，每次出现都重新构造同样的内在状态。',styles.map(s=>s.id),[...glyphs,...styles],links,[['字符出现次数',3],['已建样式',shared?1:3]],shared?'get(A, Serif) → #1, #1, #1':'创建 #1, #2, #3'),
      f('带上外部状态绘制','共享样式不包含位置；同一份内在状态可以在不同位置绘制。',glyphs.map(g=>g.id),[...glyphs,...styles],links,[['样式对象',shared?1:3],['位置上下文',3],['本例省去样式副本',shared?2:0]],'draw(style, x, y) → 三个独立位置')
    ]};
  };
  const proxy = allowed => {
    const nodes=[n('client','客户端','read()',130,205),n('proxy','访问代理',allowed?'已授权':'未授权',395,205,'accent'),n('real','真实文件','read()',660,205,'blue')];
    return {label:allowed?'允许访问':'拒绝访问',frames:[
      f('请求同一接口','代理与真实对象都提供 read()，客户端先访问代理。',['client'],nodes,[e('client','proxy','read()')],[['权限',allowed?'允许':'拒绝'],['真实调用次数',0]],'client → proxy.read()'),
      f('代理检查访问条件',allowed?'检查通过，才把调用转交给真实对象。':'检查失败，代理直接返回拒绝结果，不触达真实对象。',['proxy'],nodes,[e('client','proxy'),...(allowed?[e('proxy','real','转交')]:[])],[['权限',allowed?'允许':'拒绝'],['真实调用次数',0]],allowed?'检查通过 → real.read()':'检查失败 → PermissionError'),
      f('观察真实对象是否执行',allowed?'真实文件被读取一次，结果经代理返回客户端。':'真实文件保持未访问，结果在代理处结束。',allowed?['real']:['proxy'],nodes,[e('client','proxy'),...(allowed?[e('proxy','real')]:[])],[['真实调用次数',allowed?1:0],['返回结果',allowed?'文件内容':'拒绝访问']],allowed?'real.read() → 文件内容':'真实对象没有执行')
    ]};
  };
  window.CREATION_PATTERNS = [
    item('singleton','单例','Singleton','creational',
      '在指定作用域内只创建一个实例，并复用同一个访问点。',
      '多个调用方必须指向同一个对象，重复构造会造成状态分散。',
      '确实需要进程内共享且生命周期明确的配置、注册表；先考虑显式依赖注入。',
      '跨进程唯一、分布式锁或数据库并发一致性；单例本身不能解决这些问题。',
      '隐藏的全局依赖增加测试隔离难度；懒初始化的并发访问需要同步。',
      {id:'flyweight',name:'享元',difference:'单例控制一种对象的实例数；享元按内在状态复用多种对象，并保留独立外部状态。'},
      `from threading import Lock

class SingletonMeta(type):
    _instances = {}
    _lock = Lock()

    def __call__(cls, *args, **kwargs):
        with cls._lock:
            if cls not in cls._instances:
                cls._instances[cls] = super().__call__(*args, **kwargs)
            return cls._instances[cls]

class Settings(metaclass=SingletonMeta):
    def __init__(self):
        self.theme = "light"

a, b = Settings(), Settings()
a.theme = "dark"
print(a is b)      # True
print(b.theme)     # dark
# 仅保护本例构造过程；并不保护所有实例方法。
# 不保证跨进程唯一；首次初始化后传入的新参数不会重新初始化。
`,{kind:'2d',metaphor:'两个调用方申请同一个配置对象',caveat:'箭头表示对象引用，不是网络请求；唯一性限于示例进程。',variants:[singleton(false),singleton(true)]}),
    item('simple-factory','简单工厂','Simple Factory','creational',
      '把按参数选择并创建产品的逻辑集中到一个入口。',
      '产品构造分支散落在调用方，新增产品时要到处修改。',
      '产品类型少且创建规则集中、变化可控的场景；简单函数通常足够。',
      '产品族需要成套一致，或大量扩展需要由不同子类独立提供产品时。',
      '调用方更简单，但集中分支会随产品增加而修改；它不属于 GoF 23 种。',
      {id:'factory-method',name:'工厂方法',difference:'简单工厂在一个入口中选择产品；工厂方法由创建者的子类覆写创建步骤。'},
      `class Americano:
    def brew(self):
        return "美式已煮好"

class Latte:
    def brew(self):
        return "拿铁已煮好"

def make_coffee(kind):
    constructors = {"americano": Americano, "latte": Latte}
    return constructors[kind]()

for kind in ("americano", "latte"):
    coffee = make_coffee(kind)
    print(coffee.brew())
# 美式已煮好
# 拿铁已煮好
`,{kind:'2d',metaphor:'按点单参数选择咖啡产品',caveat:'这里每次创建新产品；工厂也可以管理复用，但不是本例的重点。',variants:[factory(false,false),factory(false,true)]}),
    item('factory-method','工厂方法','Factory Method','creational',
      '在父类定义创建接口，让子类决定工作流程中使用的具体产品。',
      '通用业务流程需要创建产品，但产品类型应由扩展点决定。',
      '框架流程稳定，插件或子类需要替换其中的产品创建步骤。',
      '只有一次简单构造、没有可复用流程或扩展需求时，直接构造更清楚。',
      '新增产品可以新增创建者子类，但产品与创建者类的数量也会增长。',
      {id:'abstract-factory',name:'抽象工厂',difference:'工厂方法关注一个创建扩展点；抽象工厂提供一组用于创建配套产品的方法。'},
      `class Americano:
    def brew(self):
        return "美式已煮好"

class Latte:
    def brew(self):
        return "拿铁已煮好"

class CoffeeShop:
    def create(self):
        raise NotImplementedError

    def serve(self):
        return self.create().brew()

class AmericanoShop(CoffeeShop):
    def create(self):
        return Americano()

class LatteShop(CoffeeShop):
    def create(self):
        return Latte()

print(AmericanoShop().serve())
print(LatteShop().serve())
`,{kind:'2d',metaphor:'店铺子类决定 serve() 使用哪种咖啡',caveat:'子类只替换创建步骤；客户端如何选择子类仍是外部配置的职责。',variants:[factory(true,false),factory(true,true)]}),
    item('abstract-factory','抽象工厂','Abstract Factory','creational',
      '通过同一个工厂创建一组相关产品，隔离具体产品族。',
      '客户端需要配套的多类产品，混搭具体实现容易破坏一致性。',
      '同一平台的按钮与菜单、同一数据库族的连接与命令等成套切换。',
      '只创建一种产品，或各产品之间没有配套关系时。',
      '新增产品族方便；新增产品种类需要修改工厂接口及所有具体工厂。',
      {id:'factory-method',name:'工厂方法',difference:'抽象工厂切换一整套配套产品；工厂方法通常替换父类流程中的某个创建步骤。'},
      `class Button:
    def __init__(self, theme):
        self.theme = theme

class Menu:
    def __init__(self, theme):
        self.theme = theme

class UIFactory:
    theme = ""
    def button(self):
        return Button(self.theme)
    def menu(self):
        return Menu(self.theme)

class LightFactory(UIFactory):
    theme = "light"

class DarkFactory(UIFactory):
    theme = "dark"

def create_ui(factory):
    button, menu = factory.button(), factory.menu()
    return button.theme, menu.theme

print(create_ui(LightFactory()))  # ('light', 'light')
print(create_ui(DarkFactory()))   # ('dark', 'dark')
`,{kind:'2d',metaphor:'同一主题工厂生产按钮与菜单',caveat:'配套一致来自客户端使用同一工厂；模式不会自动阻止外部手动混搭。',variants:[family(false),family(true)]}),
    item('builder','建造者','Builder','creational',
      '把复杂产品拆成构建步骤，用不同步骤组合生成不同表示。',
      '构造参数过多或步骤有依赖，一次构造很难表达过程和不同配方。',
      '复杂请求、文档或套餐需要分步构建，同一流程可生成不同产品表示。',
      '只有几个独立参数时，普通构造器、命名参数或 dataclass 通常更直接。',
      '过程更清晰，但增加构建器；必须明确取出产品后的复用与重置规则。',
      {id:'abstract-factory',name:'抽象工厂',difference:'建造者逐步组装一个复杂产品；抽象工厂创建多个彼此配套的产品。'},
      `class SandwichBuilder:
    def __init__(self):
        self.parts = []

    def add(self, part):
        self.parts.append(part)
        return self

    def build(self):
        product = tuple(self.parts)
        self.parts = []
        return product

def make_meal(builder, deluxe=False):
    builder.add("面包").add("芝士")
    if deluxe:
        builder.add("番茄")
    return builder.build()

builder = SandwichBuilder()
print(make_meal(builder))        # ('面包', '芝士')
print(make_meal(builder, True))  # ('面包', '芝士', '番茄')
`,{kind:'3d',metaphor:'按步骤搭建不同层数的套餐',caveat:'实体层代表已加入的产品部分，不是 Python 的内存布局；链式调用本身不等于建造者。',variants:[builder(false),builder(true)]}),
    item('prototype','原型','Prototype','creational',
      '以已有对象为原型复制新对象，再调整副本。',
      '初始化复杂或具体类型不宜暴露，但需要创建结构相似的对象。',
      '文档模板、编辑器图元、复杂配置等需要按已有实例复制。',
      '对象含文件句柄、锁或外部连接时，需要明确复制语义，不能直接假定 deepcopy 正确。',
      '减少重复初始化，但必须决定哪些嵌套状态共享，哪些递归复制；复制不保证一定更快。',
      {id:'builder',name:'建造者',difference:'原型从已有对象复制；建造者从构建步骤逐步得到对象。'},
      `from copy import copy, deepcopy
from dataclasses import dataclass

@dataclass
class Document:
    title: str
    tags: list

original = Document("原稿", ["草稿"])
shallow = copy(original)
deep = deepcopy(original)
shallow.tags.append("已审")

print(shallow is original)           # False
print(shallow.tags is original.tags) # True
print(deep.tags is original.tags)    # False
print(original.tags)  # ['草稿', '已审']
print(deep.tags)      # ['草稿']
`,{kind:'2d',metaphor:'复制文档后修改嵌套标签列表',caveat:'展示普通可复制 Python 对象；自定义复制协议或外部资源可能需要特别处理。',variants:[prototype(false),prototype(true)]}),
    item('adapter','适配器','Adapter','structural',
      '把现有对象的接口转换成客户端需要的接口。',
      '已有功能能完成工作，但方法名、参数或返回形态与目标接口不一致。',
      '接入旧库、第三方 SDK 或协议迁移；把转换限制在明确边界内。',
      '双方语义根本不兼容时，改方法名无法解决业务契约差异。',
      '复用旧实现，但增加转发层；参数、错误与返回值的语义也需要适配。',
      {id:'bridge',name:'桥接',difference:'适配器补齐已有接口的不兼容；桥接在设计时拆开两个独立变化维度。'},
      `class LegacyGateway:
    def push(self, text):
        return f"已送达: {text}"

class GatewayAdapter:
    def __init__(self, legacy):
        self.legacy = legacy

    def send(self, text):
        return self.legacy.push(text)

def notify(gateway):
    return gateway.send("订单已创建")

gateway = GatewayAdapter(LegacyGateway())
print(notify(gateway))  # 已送达: 订单已创建
# notify(LegacyGateway()) 会因没有 send() 而失败。
`,{kind:'2d',metaphor:'把旧 push() 接口接入新的 send() 客户端',caveat:'本例只需要转换方法名；实际适配可能还需转换参数、返回值与错误。',variants:[adapter(true),adapter(false)]}),
    item('bridge','桥接','Bridge','structural',
      '将抽象与实现分开，通过组合让两个维度独立变化。',
      '两个变化维度全部用继承组合，子类数量会按组合数量增长。',
      '通知级别 × 发送通道、图形 × 渲染后端等确有两个独立变化轴。',
      '只有一个变化维度时，不必预设第二个接口层。',
      '组合避免继承组合爆炸，但接口分层与对象配置更复杂。',
      {id:'adapter',name:'适配器',difference:'桥接主动设计独立演化的抽象和实现；适配器包装已有不兼容接口。'},
      `class SmsSender:
    def send(self, text):
        return f"短信: {text}"

class EmailSender:
    def send(self, text):
        return f"邮件: {text}"

class Notice:
    def __init__(self, sender):
        self.sender = sender
    def deliver(self, text):
        return self.sender.send(text)

class UrgentNotice(Notice):
    def deliver(self, text):
        return self.sender.send(f"[紧急] {text}")

for sender in (SmsSender(), EmailSender()):
    print(UrgentNotice(sender).deliver("服务异常"))
# 短信: [紧急] 服务异常
# 邮件: [紧急] 服务异常
`,{kind:'2d',metaphor:'紧急通知跨过发送接口，切换短信或邮件实现',caveat:'箭头表示持有并委托实现；示例只模拟发送，不产生网络请求。',variants:[bridge(false),bridge(true)]}),
    item('composite','组合','Composite','structural',
      '用统一接口表示叶节点与容器，递归处理树形整体。',
      '部分与整体嵌套成树，调用方不想为单项和分组维护两套处理代码。',
      '文件目录、组织结构、菜单与订单分组等具有递归部分整体关系的数据。',
      '需要严格限制不同节点可执行的操作时，要避免一个过宽的统一接口。',
      '递归调用简单，但需要维护无环树与节点所有权；叶子不一定适合所有容器操作。',
      {id:'decorator',name:'装饰器',difference:'组合通常聚合多个子项，表达树；装饰器通常包裹单个组件，逐层增强行为。'},
      `class Item:
    def __init__(self, price):
        self.price = price
    def total(self):
        return self.price

class Group:
    def __init__(self, *children):
        self.children = children
    def total(self):
        return sum(child.total() for child in self.children)

coffee, cake, cookie = Item(20), Item(30), Item(10)
flat = Group(coffee, cake)
nested = Group(coffee, Group(cake, cookie))

print(flat.total())    # 50
print(nested.total())  # 60
# Item 与 Group 都提供 total()；本例假设结构无环。
`,{kind:'3d',metaphor:'订单分组形成可递归汇总的层次树',caveat:'高度仅表示树的层级；连线表示包含关系，不表示调用耗时或内存距离。',variants:[composite(false),composite(true)]}),
    item('decorator','装饰器','Decorator','structural',
      '保持组件接口，用持有组件的包装器逐层增加行为。',
      '功能可以多种组合且要按对象动态添加，继承难覆盖所有组合。',
      'I/O 流、日志、压缩、计费附加项等可组合的增强操作。',
      '只是控制能否访问一个对象时，应优先按代理的目的来理解。',
      '组合灵活，但调用层次增加；包装顺序可能改变结果和调试路径。',
      {id:'proxy',name:'代理',difference:'装饰器着重叠加行为；代理着重控制访问，二者可能具有相似的包装结构。'},
      `class Coffee:
    def cost(self):
        return 20

class Extra:
    def __init__(self, inner):
        self.inner = inner
    def cost(self):
        return self.inner.cost()

class Milk(Extra):
    def cost(self):
        return super().cost() + 5

class Sugar(Extra):
    def cost(self):
        return super().cost() + 2

print(Milk(Coffee()).cost())         # 25
print(Sugar(Milk(Coffee())).cost())  # 27
# 这是 GoF 对象装饰器，不等同于 Python 的 @ 语法。
`,{kind:'3d',metaphor:'外层费用包装器调用内层，再逐层返回加价结果',caveat:'分层是展开的调用嵌套示意；本例加价可交换，但其他装饰操作未必可以交换顺序。',variants:[decorator(false),decorator(true)]}),
    item('facade','外观 / 门面','Facade','structural',
      '为复杂子系统提供一个面向任务的简化入口。',
      '客户端需要记住多个子系统和调用顺序，耦合到过多细节。',
      '为常用流程提供稳定入口，例如初始化、结账或一键开启影院。',
      '不要把所有业务塞进一个全能门面；跨服务事务也不会因此自动保证。',
      '降低客户端耦合，但门面要保持职责集中，避免变成巨型类。',
      {id:'proxy',name:'代理',difference:'外观面向一个子系统提供简化的新接口；代理通常保持目标接口并控制访问。'},
      `class Light:
    def set(self, mode):
        return f"灯光: {mode}"

class Screen:
    def set(self, mode):
        return f"屏幕: {mode}"

class Player:
    def set(self, mode):
        return f"播放器: {mode}"

class Cinema:
    def __init__(self):
        self.light, self.screen, self.player = Light(), Screen(), Player()
    def watch(self):
        return [self.light.set("调暗"), self.screen.set("展开"), self.player.set("播放")]
    def stop(self):
        return [self.player.set("停止"), self.screen.set("收起"), self.light.set("开启")]

cinema = Cinema()
print(cinema.watch())
print(cinema.stop())
`,{kind:'2d',metaphor:'一次观影操作协调灯光、屏幕和播放器',caveat:'仅展示成功路径与协调顺序，不包含失败回滚；门面不会自动提供事务。',variants:[facade(false),facade(true)]}),
    item('flyweight','享元','Flyweight','structural',
      '共享不可变的内在状态，把每次使用的外部状态单独传入。',
      '大量细粒度对象有重复的大块状态，重复存储造成开销。',
      '字形、棋子样式、地图纹理等重复状态多、共享价值明确的场景。',
      '对象很少、共享查找成本更高，或共享状态必须频繁独立修改时。',
      '节省重复状态，但要维护共享池，严格隔离位置等外部状态并控制池生命周期。',
      {id:'singleton',name:'单例',difference:'享元允许按键存在多份共享实例；单例约束指定作用域中的单一实例。'},
      `from dataclasses import dataclass

@dataclass(frozen=True)
class GlyphStyle:
    char: str
    font: str
    def draw(self, x, y):
        return f"{self.char}/{self.font}@({x},{y})"

class StylePool:
    def __init__(self):
        self.styles = {}
    def get(self, char, font):
        key = (char, font)
        if key not in self.styles:
            self.styles[key] = GlyphStyle(char, font)
        return self.styles[key]

pool = StylePool()
styles = [pool.get("A", "Serif") for _ in range(3)]
print(styles[0] is styles[1])  # True
print(len(pool.styles))        # 1
for x, style in enumerate(styles):
    print(style.draw(x, 0))
# 三个位置上下文共享同一个不可变样式；本例池不处理并发。
`,{kind:'3d',metaphor:'三个字符位置引用同一份内在样式',caveat:'对象数是本例计算值，不是内存字节数；节省的是重复样式，位置上下文仍然各自存在。',variants:[flyweight(true),flyweight(false)]}),
    item('proxy','代理','Proxy','structural',
      '通过保持目标接口的替身控制对真实对象的访问。',
      '直接访问对象不方便或不允许，需要鉴权、延迟加载、缓存或远程转发。',
      '保护代理、虚拟代理和远程代理；代理与真实对象遵守同一调用契约。',
      '只想对多个子系统提供更简单的操作入口时，属于外观的主要目的。',
      '访问策略集中，但增加一层间接调用；远程失败、缓存一致性等仍需单独处理。',
      {id:'decorator',name:'装饰器',difference:'代理决定是否、何时、怎样到达目标；装饰器强调在目标行为之外叠加功能。'},
      `class SecretFile:
    def __init__(self):
        self.reads = 0
    def read(self):
        self.reads += 1
        return "文件内容"

class FileProxy:
    def __init__(self, target, allowed):
        self.target, self.allowed = target, allowed
    def read(self):
        if not self.allowed:
            raise PermissionError("拒绝访问")
        return self.target.read()

target = SecretFile()
for allowed in (False, True):
    try:
        print(FileProxy(target, allowed).read())
    except PermissionError as error:
        print(error)
print(target.reads)  # 1，拒绝时没有触达真实对象
`,{kind:'2d',metaphor:'鉴权代理决定是否访问真实文件',caveat:'权限为教学用布尔值；实际系统不能让调用方自行声明可信权限。',variants:[proxy(true),proxy(false)]})
  ];
})();
