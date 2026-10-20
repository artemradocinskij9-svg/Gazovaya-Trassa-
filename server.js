const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const QRCode = require("qrcode");
const path = require("path");
const crypto = require("crypto");

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = process.env.PORT || 3000;

app.use(express.json({limit:"1mb"}));
app.use(express.static(path.join(__dirname, "public")));

const rooms = new Map();

const DEFAULT_QUESTIONS = [
  {id:"q1", text:"Какой компонент составляет основную часть природного газа?", answers:["Метан", "Этан", "Пропан", "Бутан"], correct:0, type:"question", difficulty:"Лёгкий"},
  {id:"q2", text:"Для чего используют сепаратор на установке подготовки газа?", answers:["Для разделения газа и жидкости", "Для бурения породы", "Для измерения глубины скважины", "Для цементирования"], correct:0, type:"question", difficulty:"Лёгкий"},
  {id:"q3", text:"Какую задачу выполняет буровой раствор?", answers:["Выносит выбуренную породу на поверхность", "Окрашивает обсадную колонну", "Увеличивает длину трубы", "Заменяет насос"], correct:0, type:"question", difficulty:"Лёгкий"},
  {id:"q4", text:"Как называется сооружение для добычи нефти или газа из недр?", answers:["Скважина", "Эстакада", "Резервуар воды", "Дымовая труба"], correct:0, type:"question", difficulty:"Лёгкий"},
  {id:"q5", text:"Какое оборудование перемещает жидкость по трубопроводу?", answers:["Насос", "Манометр", "Термометр", "Фильтр воздуха"], correct:0, type:"question", difficulty:"Лёгкий"},
  {id:"q6", text:"Как называется прибор для измерения давления?", answers:["Манометр", "Термометр", "Ареометр", "Секундомер"], correct:0, type:"question", difficulty:"Лёгкий"},
  {id:"q7", text:"Что показывает термометр?", answers:["Температуру", "Давление", "Расход", "Уровень шума"], correct:0, type:"question", difficulty:"Лёгкий"},
  {id:"q8", text:"Для чего нужна обсадная колонна?", answers:["Для укрепления стенок скважины и изоляции пластов", "Для окрашивания скважины", "Для охлаждения двигателя", "Для измерения ветра"], correct:0, type:"question", difficulty:"Лёгкий"},
  {id:"q9", text:"Что обычно транспортируют по газопроводу?", answers:["Природный газ", "Только питьевую воду", "Горную породу", "Бетон"], correct:0, type:"question", difficulty:"Лёгкий"},
  {id:"q10", text:"Как называется процесс разделения газовой и жидкой фаз?", answers:["Сепарация", "Перфорация", "Калибровка", "Сварка"], correct:0, type:"question", difficulty:"Лёгкий"},
  {id:"q11", text:"Зачем на промысле контролируют давление?", answers:["Для безопасной и устойчивой работы оборудования", "Чтобы изменить цвет газа", "Чтобы увеличить длину труб", "Только для учёта температуры"], correct:0, type:"question", difficulty:"Средний"},
  {id:"q12", text:"Что может вызвать кавитацию в центробежном насосе?", answers:["Недостаточное давление на входе и образование паровых пузырьков", "Яркое освещение", "Окраска корпуса", "Низкая скорость ветра"], correct:0, type:"question", difficulty:"Средний"},
  {id:"q13", text:"Для чего цементируют обсадную колонну?", answers:["Для закрепления колонны и изоляции пластов", "Для повышения солёности воды", "Для изменения состава стали", "Для очистки наружной поверхности"], correct:0, type:"question", difficulty:"Средний"},
  {id:"q14", text:"Что означает дебит скважины?", answers:["Количество продукции за единицу времени", "Глубину скважины", "Диаметр обсадной трубы", "Температуру породы"], correct:0, type:"question", difficulty:"Средний"},
  {id:"q15", text:"Какова задача установки комплексной подготовки газа?", answers:["Подготовить газ до требуемых параметров перед транспортировкой", "Пробурить новую скважину", "Производить цемент", "Измерять длину труб"], correct:0, type:"question", difficulty:"Средний"},
  {id:"q16", text:"Зачем газ осушают перед транспортировкой?", answers:["Чтобы снизить риск гидратообразования и коррозии", "Чтобы увеличить содержание песка", "Чтобы повысить влажность труб", "Чтобы заменить компрессор"], correct:0, type:"question", difficulty:"Средний"},
  {id:"q17", text:"Что измеряет расходомер?", answers:["Количество вещества, проходящее за единицу времени", "Температуру металла", "Глубину пласта", "Твёрдость породы"], correct:0, type:"question", difficulty:"Средний"},
  {id:"q18", text:"Что может произойти при негерметичности газового оборудования?", answers:["Утечка газа и возникновение опасной ситуации", "Автоматическое исчезновение всех рисков", "Повышение прочности трубы", "Самоочистка фильтра"], correct:0, type:"question", difficulty:"Средний"},
  {id:"q19", text:"Для чего применяют компрессор на газовом промысле?", answers:["Для повышения давления газа", "Для измерения температуры", "Для цементирования скважины", "Для отделения песка магнитом"], correct:0, type:"question", difficulty:"Средний"},
  {id:"q20", text:"Что такое перфорация продуктивного пласта?", answers:["Создание каналов для сообщения скважины с пластом", "Проверка цвета газа", "Промывка пола установки", "Измерение массы компрессора"], correct:0, type:"question", difficulty:"Средний"},
  {id:"q21", text:"Что характеризует вязкость бурового раствора?", answers:["Сопротивление раствора течению", "Цвет при дневном свете", "Длину бурильной колонны", "Давление в шинах"], correct:0, type:"question", difficulty:"Сложный"},
  {id:"q22", text:"Почему высокая температура может осложнить работу насоса?", answers:["Может увеличить давление насыщенных паров и риск кавитации", "Всегда делает жидкость твёрдой", "Всегда устраняет потери давления", "Не влияет на насос"], correct:0, type:"question", difficulty:"Сложный"},
  {id:"q23", text:"Какова цель гидравлического расчёта трубопровода?", answers:["Оценить потери давления и подобрать режим транспортировки", "Определить цвет опор", "Посчитать работников смены", "Выбрать название месторождения"], correct:0, type:"question", difficulty:"Сложный"},
  {id:"q24", text:"Почему важно изолировать продуктивные пласты при строительстве скважины?", answers:["Чтобы предотвратить межпластовые перетоки и сохранить контроль над скважиной", "Чтобы смешать все пласты", "Чтобы отказаться от контроля давления", "Чтобы увеличить коррозию"], correct:0, type:"question", difficulty:"Сложный"},
  {id:"q25", text:"Что характеризует коэффициент продуктивности скважины?", answers:["Связь дебита с перепадом давления при заданных условиях", "Цвет фонтанной арматуры", "Высоту факельной установки", "Массу буровой вышки"], correct:0, type:"question", difficulty:"Сложный"},
  {id:"q26", text:"Для чего контролируют фильтрацию бурового раствора?", answers:["Чтобы оценить отдачу жидкой фазы в породу и риск образования корки", "Чтобы измерить шум", "Чтобы определить число клапанов", "Чтобы узнать цвет цемента"], correct:0, type:"question", difficulty:"Сложный"},
  {id:"q27", text:"Что такое гидраты природного газа?", answers:["Твёрдые кристаллические соединения газа и воды при определённых условиях", "Смесь газа с металлической стружкой", "Любой жидкий углеводород", "Вид обсадной трубы"], correct:0, type:"question", difficulty:"Сложный"},
  {id:"q28", text:"Для чего применяют предохранительные клапаны?", answers:["Для защиты оборудования от недопустимого превышения давления", "Для повышения давления без ограничений", "Для измерения температуры", "Для удаления всех примесей"], correct:0, type:"question", difficulty:"Сложный"},
  {id:"q29", text:"Что может означать падение давления в трубопроводе при неизменном режиме?", answers:["Возможное изменение расхода, сопротивления или состояния системы", "Что газ превратился в металл", "Что все датчики исправны", "Что утечка невозможна"], correct:0, type:"question", difficulty:"Сложный"},
  {id:"q30", text:"Зачем проводят техническое обслуживание по графику?", answers:["Чтобы выявлять износ и снижать вероятность отказов", "Чтобы сокращать срок службы", "Чтобы отказаться от инструкций", "Чтобы увеличить число аварий"], correct:0, type:"question", difficulty:"Средний"},
  {id:"q31", text:"Что делать при обнаружении признаков утечки газа?", answers:["Действовать по инструкции аварийного реагирования и сообщить ответственному персоналу", "Игнорировать сигнал", "Разбирать оборудование под давлением", "Включить любое электрооборудование рядом"], correct:0, type:"question", difficulty:"Лёгкий"},
  {id:"q32", text:"Что означает давление насыщенного пара жидкости?", answers:["Давление пара в равновесии с жидкостью при данной температуре", "Давление в автомобильной шине", "Давление воздуха на любой высоте", "Скорость движения жидкости"], correct:0, type:"question", difficulty:"Сложный"},
  {id:"q33", text:"Для чего измеряют перепад давления на фильтре?", answers:["Чтобы оценить сопротивление и возможное загрязнение", "Чтобы узнать состав стали", "Чтобы измерить глубину скважины", "Чтобы определить освещённость"], correct:0, type:"question", difficulty:"Средний"},
  {id:"q34", text:"Какую функцию выполняет устьевая арматура?", answers:["Управляет потоком и обеспечивает герметизацию устья", "Заменяет пласт", "Измеряет длину месторождения", "Служит только опорой"], correct:0, type:"question", difficulty:"Средний"},
  {id:"q35", text:"Почему нельзя игнорировать сигнал газоанализатора?", answers:["Он может указывать на опасную концентрацию газа", "Он всегда означает поломку экрана", "Он нужен только для подсчёта времени", "Он не связан с безопасностью"], correct:0, type:"question", difficulty:"Лёгкий"},
  {id:"q36", text:"Что такое гидравлическое сопротивление трубопровода?", answers:["Потери энергии потока из-за трения и местных сопротивлений", "Масса газа в резервуаре", "Температура воздуха", "Длина кабеля датчика"], correct:0, type:"question", difficulty:"Сложный"},
  {id:"q37", text:"Какова роль контрольно-измерительных приборов?", answers:["Контролировать параметры процесса и помогать поддерживать безопасный режим", "Украшать пульт", "Устранять любые неисправности автоматически", "Заменять инструкции"], correct:0, type:"question", difficulty:"Средний"},
  {id:"q38", text:"Что показывает плотность газа при заданных условиях?", answers:["Массу газа в единице объёма", "Количество труб", "Время работы смены", "Диаметр манометра"], correct:0, type:"question", difficulty:"Средний"},
  {id:"q39", text:"Зачем проводят опрессовку оборудования?", answers:["Чтобы проверить прочность и герметичность по установленной процедуре", "Чтобы увеличить шероховатость металла", "Чтобы изменить цвет труб", "Чтобы определить стаж оператора"], correct:0, type:"question", difficulty:"Сложный"},
  {id:"q40", text:"Почему важно учитывать совместимость материалов с добываемой средой?", answers:["Чтобы снизить риск коррозии, разрушения и потери герметичности", "Чтобы повысить шум", "Чтобы исключить осмотры", "Чтобы ускорить окрашивание"], correct:0, type:"question", difficulty:"Сложный"}
];

const PATH = [
 [10,31],[12,34],[15,37],[18,40],[21,43],[25,45],[29,45],[33,43],
 [35,40],[34,37],[31,34],[28,34],[25,35],[22,38],[20,42],[20,46],
 [23,49],[27,51],[31,51],[35,50],[39,47],[43,44],[47,41],[50,37],
 [51,33],[48,30],[44,29],[40,30],[37,33],[35,37],[36,41],[40,44],
 [44,47],[49,48],[53,48],[57,45],[60,41],[63,37],[66,34],[70,31],
 [74,28],[78,25],[82,23],[86,22],[88,26],[86,30],[82,32],[78,34],
 [74,37],[70,40],[67,44],[64,48],[62,52],[61,57],[62,62],[66,66],
 [71,68],[76,66],[80,62],[83,58],[86,54],[90,53],[93,56],[91,60],
 [87,64],[83,67],[79,70],[76,74],[74,79],[71,84],[67,87],[62,89],
 [57,90],[52,88],[48,84],[44,81],[40,80],[36,82],[32,86],[28,89],
 [23,90],[20,87],[18,82],[19,77],[23,73],[28,70],[33,68],[38,66],
 [43,64],[48,61],[52,58],[55,54]
];

const SPECIALS = {
  skip: new Set([21, 47, 65]),
  again: new Set([39, 60]),
  easy: new Set([8, 15, 25, 34, 53, 69, 91]),
  camera: new Set([12]),
  cross: new Set([46]),
  diagnostics: new Set([57])
};

function code() { let c; do c=crypto.randomBytes(3).toString("hex").toUpperCase(); while(rooms.has(c)); return c; }
function publicUrl(req, roomCode){
const host = process.env.PUBLIC_HOST || "192.168.0.101:3000";
return `http://${host}/?room=${encodeURIComponent(roomCode)}`;
}
function roomSnapshot(room) {
  return {
    code: room.code,
    roomName: room.roomName,
    hostId: room.hostId,
    started: room.started,
    finished: room.finished,
    winnerId: room.winnerId || null,
    teams: room.teams.map(t => ({
      id:t.id, name:t.name, players:t.players, pos:t.pos, skip:t.skip, again:t.again,
      connected:t.connected, pending:t.pending, currentPlayer:t.currentPlayer
    })),
    questions: room.questions,
    log: room.log.slice(0,50),
    pathLength: PATH.length,
    specials: {
      skip:[...SPECIALS.skip], again:[...SPECIALS.again], easy:[...SPECIALS.easy],
      camera:[...SPECIALS.camera], cross:[...SPECIALS.cross], diagnostics:[...SPECIALS.diagnostics]
    }
  };
}
function emitRoom(room) { io.to(room.code).emit("state", roomSnapshot(room)); }
function addLog(room, text) { room.log.unshift(text); room.log = room.log.slice(0,50); }
function findRoom(code) { return rooms.get(String(code||"").toUpperCase()); }
function resetGame(room) {
  room.started = false;
  room.finished = false;
  room.winnerId = null;
  room.teams.forEach(t => {
    t.pos = 0;
    t.skip = false;
    t.again = false;
    t.pending = null;
    t.currentPlayer = 0;
  });
  room.log = [];
  addLog(room, `🔄 Игра «${room.roomName}» подготовлена к новому раунду.`);
}
function cleanTeams(teams, count){
  const list=Array.isArray(teams)?teams:[];
  const n=Math.max(2,Math.min(12,Number(count)||list.length||2));
  return Array.from({length:n},(_,i)=>{
    const t=list[i]||{};
    return {id:"t"+i,name:String(t.name||`Команда ${i+1}`).slice(0,40),players:(Array.isArray(t.players)?t.players:[]).slice(0,4).map(x=>String(x||"").slice(0,30)),pos:0,skip:false,again:false,connected:0,pending:null,currentPlayer:0};
  });
}

app.get("/api/qr/:code", async (req,res)=>{
  const room=findRoom(req.params.code);
  if(!room) return res.status(404).send("Комната не найдена");
  res.type("png").send(await QRCode.toBuffer(publicUrl(req,room.code),{width:520,margin:2,errorCorrectionLevel:"M"}));
});
app.get("*",(req,res)=>res.sendFile(path.join(__dirname,"public","index.html")));

io.on("connection", socket=>{
  socket.on("requestState", ({code})=>{
    const room=findRoom(code);
    if(!room) return socket.emit("errorMsg","Комната не найдена.");
    socket.emit("state",roomSnapshot(room));
  });

  // Первый человек, который нажимает «Создать комнату», становится её администратором.
  socket.on("createRoom", ({roomName,teamCount,teams})=>{
    const safeName=String(roomName||"Газовая трасса").trim().slice(0,60)||"Газовая трасса";
    const c=code();
    const room={
      code:c, roomName:safeName, hostId:socket.id, started:false, finished:false, winnerId:null,
      teams:cleanTeams(teams,teamCount), questions:DEFAULT_QUESTIONS.map(q=>({...q})),
      log:[], sockets:new Map()
    };
    rooms.set(c,room);
    socket.join(c); room.sockets.set(socket.id,{role:"host"});
    addLog(room,`👑 Администратор создал комнату «${room.roomName}».`);
   socket.emit("created", {
code: c,
roomName: room.roomName,
url: publicUrl(null, c)
});
    // Клиент сам строит корректную ссылку из location.origin; URL здесь нужен только как fallback.
    emitRoom(room);
  });

  socket.on("joinRoom", ({code,name,teamId,playerIndex})=>{
    const room=findRoom(code);
    if(!room) return socket.emit("errorMsg","Комната не найдена.");
    if(room.finished) return socket.emit("errorMsg","Эта игра уже завершена.");
    const team=room.teams.find(t=>t.id===teamId);
    if(!team) return socket.emit("errorMsg","Команда не найдена.");
    const idx=Math.max(0,Math.min(3,Number(playerIndex)||0));
    const clean=String(name||"Игрок").trim().slice(0,30)||"Игрок";
    const occupied=[...room.sockets.values()].some(x=>x.role==="player"&&x.teamId===teamId&&x.playerIndex===idx);
    if(occupied) return socket.emit("errorMsg","Это место уже занято. Выберите другого игрока.");
    socket.join(room.code);
    room.sockets.set(socket.id,{role:"player",teamId,playerIndex:idx,name:clean});
    team.players[idx]=clean;
    team.connected++;
    socket.emit("joined",{code:room.code,teamId,playerIndex:idx});
    addLog(room,`👤 ${clean} присоединился к команде «${team.name}».`);
    emitRoom(room);
  });

  socket.on("updateTeams", ({code,teams,teamCount})=>{
    const room=findRoom(code);
    if(!room || room.hostId!==socket.id || room.started) return;
    room.teams=cleanTeams(teams,teamCount);
    emitRoom(room);
  });

  socket.on("startGame", ({code})=>{
    const room=findRoom(code);
    if(!room||room.hostId!==socket.id||room.started)return;
    room.started=true;
    addLog(room,`▶ Игра «${room.roomName}» началась.`);
    emitRoom(room);
  });

  socket.on("addQuestion", ({code,q})=>{
    const room=findRoom(code); if(!room||room.hostId!==socket.id)return;
    if(!q||!q.type)return;
    const question={
      id:crypto.randomUUID(), text:String(q.text||"").slice(0,500),
      answers:Array.isArray(q.answers)?q.answers.slice(0,6).map(x=>String(x).slice(0,200)):[],
      correct:Number(q.correct)||0, type:q.type
    };
    if((question.type==="question"||question.type==="easy") && (!question.text || question.answers.length<2 || question.correct<0 || question.correct>=question.answers.length)) return;
    room.questions.push(question); emitRoom(room);
  });
  socket.on("deleteQuestion", ({code,id})=>{
    const room=findRoom(code); if(!room||room.hostId!==socket.id)return;
    room.questions=room.questions.filter(q=>q.id!==id); emitRoom(room);
  });
  socket.on("replaceQuestions", ({code,questions})=>{
    const room=findRoom(code); if(!room||room.hostId!==socket.id||!Array.isArray(questions))return;
    room.questions=questions.slice(0,1000); emitRoom(room);
  });

  // Каждый team.pending хранит свой вопрос/спецклетку. Поэтому команды никогда не блокируют друг друга.
  socket.on("roll", ({code,teamId})=>{
    const room=findRoom(code);
    if(!room||!room.started||room.finished)return;
    const caller=room.sockets.get(socket.id);
    if(!caller)return;
    const team=room.teams.find(t=>t.id===teamId);
    if(!team)return;
    if(caller.role==="player" && caller.teamId!==teamId)return;
    if(caller.role!=="host" && caller.role!=="player")return;
    if(team.pending)return;

    if(team.skip){
      team.skip=false;
      addLog(room,`⛔ ${team.name} пропускает ход.`);
      team.currentPlayer=(team.currentPlayer+1)%4;
      emitRoom(room);
      return;
    }

    const fromPos=team.pos;
    const n=Math.floor(Math.random()*6)+1;
    const toPos=Math.min(PATH.length-1,team.pos+n);
    io.to(room.code).emit("diceRoll",{teamId:team.id,result:n,teamName:team.name});
    io.to(room.code).emit("teamMove",{teamId:team.id,fromPos,toPos,result:n,teamName:team.name});
    team.pos=toPos;
    addLog(room,`🎲 ${team.name}: выпало ${n}, переход на клетку ${team.pos+1}.`);

    if(team.pos>=PATH.length-1){
      room.finished=true;
      room.winnerId=team.id;
      addLog(room,`🏆 ${team.name} победила!`);
      emitRoom(room);
      return;
    }

    const cell=team.pos+1;
    const makePending=(type,q=null,extra={})=>{ team.pending={type,team:team.id,cell,q,...extra}; emitRoom(room); };
    // Случайные нефтегазовые события: бонусные и штрафные перемещения.
    if(Math.random()<0.22){
      const events=[{delta:-3,label:"⛔ Аварийная остановка: назад на 3 хода"},{delta:-6,label:"🚧 Сложный участок: назад на 6 ходов"},{delta:3,label:"⚡ Ускоренная прокачка: вперёд на 3 хода"},{delta:6,label:"🚀 Высокое давление: вперёд на 6 ходов"},{delta:0,label:"🛠 Техническая проверка: без перемещения"},{delta:0,label:"🎯 Удачный маршрут: без штрафа"}];
      const ev=events[Math.floor(Math.random()*events.length)];
      return makePending("event",null,{delta:ev.delta,label:ev.label});
    }
    if(SPECIALS.skip.has(cell)) return makePending("skip");
    if(SPECIALS.again.has(cell)) return makePending("again");
    if(SPECIALS.camera.has(cell)) return makePending("camera");
    if(SPECIALS.cross.has(cell)) return makePending("cross");
    if(SPECIALS.diagnostics.has(cell)) return makePending("diagnostics");

    let pool=room.questions;
    // Не повторять последнюю карточку этой команды, если есть другие вопросы.
    if(team.lastQuestionId && pool.length>1){const fresh=pool.filter(item=>item.id!==team.lastQuestionId);if(fresh.length)pool=fresh;}
    const q=pool.length?pool[Math.floor(Math.random()*pool.length)]:null;
    if(q) team.lastQuestionId=q.id;
    if(q) return makePending("question",q);

    team.currentPlayer=(team.currentPlayer+1)%4;
    emitRoom(room);
  });

  socket.on("newGame", ({code})=>{
    const room=findRoom(code);
    if(!room || room.hostId!==socket.id)return;
    resetGame(room);
    emitRoom(room);
  });

  socket.on("resolve", ({code,teamId,result})=>{
    const room=findRoom(code);
    if(!room||room.finished)return;
    const caller=room.sockets.get(socket.id);
    if(!caller || !(caller.role==="host" || (caller.role==="player" && caller.teamId===teamId && caller.playerIndex===0)))return;
    const team=room.teams.find(t=>t.id===teamId);
    if(!team||!team.pending)return;
    const p=team.pending;

    if(p.type==="skip"){
      team.skip=true;
      addLog(room,`⛔ ${team.name} получил пропуск следующего хода.`);
    } else if(p.type==="again"){
      team.again=true;
      addLog(room,`🎲 ${team.name} получает ещё один бросок.`);
    } else if(p.type==="camera"){
      addLog(room,`📷 ${team.name}: «Камера приёма запуска» — действие завершено.`);
    } else if(p.type==="cross"){
      addLog(room,`🔀 ${team.name}: «Перекрёсток» — действие завершено.`);
    } else if(p.type==="diagnostics"){
      addLog(room,`🔧 ${team.name}: «Внутритрубная диагностика» — действие завершено.`);
    } else if(p.type==="question"){
      addLog(room,`${team.name}: ${result?.correct?'✅ правильный':'❌ неправильный'} ответ.`);
    } else if(p.type==="event"){
      const before=team.pos;
      team.pos=Math.max(0,Math.min(PATH.length-1,team.pos+(Number(p.delta)||0)));
      addLog(room,`${p.label} — команда «${team.name}» ${team.pos>before?'продвинулась вперёд':team.pos<before?'отступила назад':'остаётся на месте'}.`);
      if(team.pos>=PATH.length-1){room.finished=true;room.winnerId=team.id;addLog(room,`🏆 ${team.name} победила!`);}
    }

    team.pending=null;
    team.currentPlayer=(team.currentPlayer+1)%4;
    emitRoom(room);
  });

  socket.on("disconnect",()=>{
    for(const room of rooms.values()){
      const s=room.sockets.get(socket.id); if(!s)continue;
      if(s.role==="player"){
        const t=room.teams.find(x=>x.id===s.teamId); if(t)t.connected=Math.max(0,t.connected-1);
        addLog(room,`📴 ${s.name} отключился.`);
        room.sockets.delete(socket.id);
      } else if(s.role==="host"){
        room.sockets.delete(socket.id);
        const next=[...room.sockets.entries()].find(([,x])=>x.role==="player");
        if(next){
          const [newId,info]=next;
          info.role="host"; room.hostId=newId;
          io.to(newId).emit("promotedHost",{code:room.code,roomName:room.roomName});
          addLog(room,"👑 Администратор отключился — права переданы следующему подключённому игроку.");
        } else {
          room.hostId=null;
          addLog(room,"⚠ Администратор отключился.");
        }
      }
      emitRoom(room);
    }
  });
});

server.listen(PORT,"0.0.0.0",()=>console.log(`Газовая трасса: http://localhost:${PORT}`));
