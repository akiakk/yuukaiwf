const chat = document.getElementById('chat-log');
const textInput = document.getElementById('textInput');
const sendButton = document.getElementById('sendButton');

let started = false;
let usedKeywords = new Set();
let startTime = null;
let isSpeaking = false;
let isDebugMode = false;
let countdownTimer = null;
let pauseTime = null;
let earlyNoiseTimer = null;
let lateNoiseTimer = null;

let validKeywords = [];
let currentLocation = "屋外";
let gameFlags = new Set();

const earlyNoise = ["…きいてますか…？", "…ここ…いる…", "だれ……？"];
const lateNoise = [
  "…なんか…まずいかもです…繧�▲縺上ｊ縺ｨ…",
  "…もう縺�繧�かも………",
  "縺上ｋ縺励＞……",
  "諤悶＞窶ｦ窶ｦ"
];

let shownEarlyNoises = new Set();
let shownLateNoises = new Set();

let earlyNoiseInterval = null;
let lateNoiseInterval = null;
let passphraseAttempts = 0;
let locationUsedKeywordsMap = new Map();

// JSONデータの読み込み
fetch('data/keywords.json')
  .then(response => response.json())
  .then(data => {
    validKeywords = data;
  })
  .catch(error => {
    console.error("キーワードの読み込みに失敗しました:", error);
    addMessage("データの読み込みに失敗しました。", false, true);
  });

// ユーティリティ: メッセージを順次送信
async function sendMessageQueue(messages, delays, isNoise = false, isSpecial = false, callback = null) {
  isSpeaking = true;
  sendButton.disabled = true;
  showTypingIndicator();

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    const delay = delays[i] || 1000;
    await new Promise(resolve => {
      setTimeout(() => {
        hideTypingIndicator();
        addMessage(msg, false, isNoise, isSpecial);
        showTypingIndicator();
        resolve();
      }, delay);
    });
  }

  hideTypingIndicator();
  isSpeaking = false;
  sendButton.disabled = !started;
  if (callback) callback();
}

// メッセージ追加（共通化）
function addMessage(text, isUser = false, isNoise = false, isSpecial = false) {
  const msg = document.createElement('div');
  msg.className = `message ${isUser ? 'user' : 'bot'}${isNoise ? ' noise' : ''}${isSpecial ? ' special-message' : ''}`;

  const messageText = document.createElement('div');
  messageText.innerText = text;

  const time = new Date();
  const timestamp = document.createElement('div');
  timestamp.className = 'timestamp';
  timestamp.innerText = `${String(time.getHours()).padStart(2, '0')}:${String(time.getMinutes()).padStart(2, '0')}`;

  msg.appendChild(messageText);
  msg.appendChild(timestamp);
  chat.appendChild(msg);
  chat.scrollTop = chat.scrollHeight;
}

// 画像メッセージ
function addImageMessage(imageSrc) {
  const msg = document.createElement('div');
  msg.className = 'message bot';

  const img = document.createElement('img');
  img.src = imageSrc;
  img.alt = 'まゆりの自撮り';
  img.style.maxWidth = '100px';
  img.style.borderRadius = '8px';
  img.style.cursor = 'pointer';

  img.addEventListener('click', () => {
    const overlay = document.createElement('div');
    overlay.id = 'image-overlay';
    const fullImg = document.createElement('img');
    fullImg.src = imageSrc;
    fullImg.alt = 'まゆりの自撮り';
    overlay.appendChild(fullImg);
    document.body.appendChild(overlay);

    overlay.addEventListener('click', () => overlay.remove());
  });

  const time = new Date();
  const timestamp = document.createElement('div');
  timestamp.className = 'timestamp';
  timestamp.innerText = `${String(time.getHours()).padStart(2, '0')}:${String(time.getMinutes()).padStart(2, '0')}`;

  msg.appendChild(img);
  msg.appendChild(timestamp);
  chat.appendChild(msg);
  chat.scrollTop = chat.scrollHeight;
}

// タイピングインジケーター
function showTypingIndicator() {
  const existing = document.getElementById('typing-indicator');
  if (existing) existing.remove();

  const indicator = document.createElement('div');
  indicator.id = 'typing-indicator';
  indicator.innerText = 'まゆりが入力中';
  indicator.style.display = 'block';
  chat.appendChild(indicator);
  chat.scrollTop = chat.scrollHeight;
}

function hideTypingIndicator() {
  const indicator = document.getElementById('typing-indicator');
  if (indicator) indicator.remove();
}

// イントロ表示
async function showIntro() {
  const introMessages = [
    "こんにちは。\n私は第四十二境界のDOLPHIN",
    "今日、あなたには怪異に囚われた一人の少女を救って頂きたいのです。\nその物語の名は──『誘怪ウォーターフロント』",
    "ただ…向こうの世界との接続が不安定となっており、\n届かないメッセージがかなり多くなってしまっているようです。\n多少、苦労するかもしれませんが…あなたなら、きっと大丈夫ですね。",
    "それでは、準備ができたら何かメッセージを送ってみて下さい。"
  ];
  await sendMessageQueue(introMessages, introMessages.map(() => 2000));
  textInput.disabled = false;
  sendButton.disabled = false;
}

// DOLPHINメッセージ
async function showDolphinMessage() {
  const dolphinText = `第四十二境界のDOLPHINです。
少女は、どのような結末を迎えましたか？私からは分からないのですが…。とにかく力になってくれてありがとうございます。
それでは、このたびはお疲れ様でした。
また次の扉でお会いできることを願って…ごきげよう。`;
  const additionalText = `本作品は第四境界の幽拐シリーズにインスパイアされ、また会期2025年4月15日（火）～20日（日）に開催されているリアルイベント 東京侵蝕2025の体験の回想に多大なフィクション（イベント中、命の心配はありません）を加え制作した個人作品となります。\n
制作・公開に当たって第四境界は一切関与しておらず、あくまでFan labor（ファンメイドコンテンツ）であることに留意して下さい。\n\n
------------------------------\n
『東京侵蝕』は、参加者が非日常に没入する「イマーシブタイプ」のイベントではなく、フィクションがあなたの日常を侵蝕する「イロージョンタイプ」の新しい体験型イベントです。参加者は自分自身が物語の一員となり、現実リアルなのか、仮想フィクションなのか、その境界が曖昧な、日常の延長線上にある物語体験を味わうことになります。\n
（公式HP引用）\n
------------------------------\n\n
イベント会場の他、ほぼ全てのコンテンツがオンラインでも体験できるようになっています。\n
今からでもまた遠方にお住まいの方も…どうかあなたの力を貸してください。`;
  await sendMessageQueue([dolphinText, additionalText], [1000, 1000], false, true);

  if (gameFlags.has("合言葉_成功")) {
    setTimeout(() => {
      const msgDiv = document.createElement('div');
      msgDiv.className = 'message bot special-message';
      const messageText = document.createElement('div');
      const p1 = document.createElement('p');
      p1.innerText = `まゆりをトゥルーエンドへ導くことの出来たあなたへ`;
      const p2 = document.createElement('p');
      const link = document.createElement('a');
      link.href = 'after.html';
      link.target = '_blank';
      link.className = 'special-link';
      link.innerText = '制作後記';
      p2.appendChild(link);
      messageText.appendChild(p1);
      messageText.appendChild(p2);
      const time = new Date();
      const timestamp = document.createElement('div');
      timestamp.className = 'timestamp';
      timestamp.innerText = `${String(time.getHours()).padStart(2, '0')}:${String(time.getMinutes()).padStart(2, '0')}`;
      msgDiv.appendChild(messageText);
      msgDiv.appendChild(timestamp);
      chat.appendChild(msgDiv);
      chat.scrollTop = chat.scrollHeight;
    }, 1000);
  }
}

// バッドエンド
async function triggerBadEndStatus() {
  stopNoise();
  textInput.disabled = true;
  sendButton.disabled = true;
  const badEndMessages = [
    { text: "…何か…来る…！もうダメかも…", delay: 1500, isNoise: false },
    { text: "あれ？既読がつかない。こっちのメッセージ届いて縺ｪ縺�ですか？", delay: 1500, isNoise: false },
    { text: "ねえ！返事してお願い！こわい！こわい縺薙ｏ縺�こわいこわい", delay: 1500, isNoise: false },
    { text: "お願い助�?て！私まだ死に縺溘￥縺ｪ縺�", delay: 1000, isNoise: false },
    { text: "助け縺ｦ", delay: 1500, isNoise: false },
    { text: "騾�＆縺ｪ縺�", delay: 2000, isNoise: true },
    { text: "騾�＆縺ｪ縺�騾�＆縺ｪ縺�", delay: 1000, isNoise: true },
    { text: "騾�＆縺ｪ縺�騾�＆縺ｪ縺�騾�＆縺ｪ縺�騾�＆縺ｪ縺�", delay: 500, isNoise: true },
    { text: "騾�＆縺ｪ縺�騾�＆縺ｪ縺�騾�＆縺ｪ縺�騾�＆縺ｪ縺�騾�＆縺ｪ縺�騾�＆縺ｪ縺�騾�＆縺ｪ縺�騾�＆縺ｪ縺�騾�＆縺ｪ縺�騾�＆縺ｪ縺�騾�＆縺ｪ縺�騾�＆縺ｪ縺�騾�＆縺ｪ縺�", delay: 500, isNoise: true }
  ];

  const messages = badEndMessages.map(m => m.text);
  const delays = badEndMessages.map(m => m.delay);
  const isNoises = badEndMessages.map(m => m.isNoise);

  await sendMessageQueue(messages, delays, isNoises, false, () => {
    started = false;
    if (countdownTimer) {
      clearTimeout(countdownTimer);
      countdownTimer = null;
      console.log("カウントダウン停止: バッドエンディング");
    }
  });

  const icon = document.getElementById("chat-icon");
  const status = document.getElementById("chat-status");
  const header = document.getElementById("chat-header");
  if (icon) icon.src = "data/img/mayuri_icon_offline.png";
  if (status) {
    status.textContent = "オフライン";
    status.classList.add("offline");
  }
  if (header) header.style.backgroundColor = "#696969";

  setTimeout(showDolphinMessage, 2000);
}

// ゲーム開始
async function startGame() {
  started = true;
  startTime = Date.now();
  isSpeaking = true;
  sendButton.disabled = true;
  textInput.disabled = true;

  usedKeywords.clear();
  locationUsedKeywordsMap.clear();
  gameFlags.clear();
  currentLocation = "屋外";
  shownEarlyNoises.clear();
  shownLateNoises.clear();
  if (earlyNoiseInterval) clearInterval(earlyNoiseInterval);
  if (lateNoiseInterval) clearInterval(lateNoiseInterval);
  if (earlyNoiseTimer) clearTimeout(earlyNoiseTimer);
  if (lateNoiseTimer) clearTimeout(lateNoiseTimer);
  document.getElementById('chat-container').className = '';
  const header = document.getElementById("chat-header");
  if (header) header.style.backgroundColor = "";

  const messages = [
    "え！？",
    "連絡が返って来た…！？",
    "急にごめんなさい！私も何がなんだか…",
    "とにかく…ほんとに、ほんとーに困ってるんです！どうか助けて…！"
  ];
  await sendMessageQueue(messages, [1000, 2000, 2000, 2000]);

  isSpeaking = false;
  sendButton.disabled = false;
  textInput.disabled = false;

  earlyNoiseTimer = setTimeout(startEarlyNoise, 180000);
  lateNoiseTimer = setTimeout(startLateNoise, 240000);

  if (countdownTimer) clearTimeout(countdownTimer);
  countdownTimer = setTimeout(triggerBadEndStatus, 300000);
}

// ノイズメッセージ
function sendNoiseMessage(noiseList, shownSet, intervalId) {
  const remaining = noiseList.filter(msg => !shownSet.has(msg));
  if (remaining.length === 0) {
    clearInterval(intervalId);
    console.log("ノイズメッセージ終了:", noiseList);
    return;
  }
  const msg = remaining[Math.floor(Math.random() * remaining.length)];
  shownSet.add(msg);
  addMessage(msg, false, true);
  console.log("ノイズメッセージ送信:", msg);
}

function startEarlyNoise() {
  earlyNoiseInterval = setInterval(() => {
    sendNoiseMessage(earlyNoise, shownEarlyNoises, earlyNoiseInterval);
  }, Math.random() * 10000 + 5000);
}

function startLateNoise() {
  lateNoiseInterval = setInterval(() => {
    sendNoiseMessage(lateNoise, shownLateNoises, lateNoiseInterval);
  }, Math.random() * 10000 + 5000);
}

function stopNoise() {
  if (earlyNoiseTimer) clearTimeout(earlyNoiseTimer);
  if (lateNoiseTimer) clearTimeout(lateNoiseTimer);
  if (earlyNoiseInterval) clearInterval(earlyNoiseInterval);
  if (lateNoiseInterval) clearInterval(lateNoiseInterval);
  earlyNoiseTimer = null;
  lateNoiseTimer = null;
  earlyNoiseInterval = null;
  lateNoiseInterval = null;
  console.log("ノイズ停止: タイマーとインターバルをクリア");
}

// デバッグメニュー
async function showDebugMenu() {
  const debugMenuText = `デバッグメニューに入りました。
どうしますか？

0.ゲーム開始時点へ戻る
1.フラグ全取得
2.カウントダウン停止
3.カウントダウン再開
4.カウントダウンリセット
5.カウントダウンを30秒経過
6.グッドエンドへスキップ
7.トゥルーエンドへスキップ
8.バッドエンドへスキップ
9.デバッグメニューを終了する
10.合言葉入力前にスキップ`;
  await sendMessageQueue([debugMenuText], [1000]);
}

function handleDebugCommand(command) {
  switch (command) {
    case '0':
      addMessage("ゲーム開始時点へ戻ります。", false);
      setTimeout(() => {
        isDebugMode = false;
        startGame();
      }, 1500);
      break;
    case '1':
      setAllFlags();
      addMessage("全てのフラグを取得します。", false);
      setTimeout(showDebugMenu, 1500);
      break;
    case '2':
      pauseCountdown();
      addMessage(`カウントダウンを一時停止します。残り時間は${Math.ceil((300000 - (pauseTime - startTime)) / 1000)}秒です。`, false);
      setTimeout(showDebugMenu, 1500);
      break;
    case '3':
      resumeCountdown();
      addMessage("カウントダウンを再開します。", false);
      setTimeout(showDebugMenu, 1500);
      break;
    case '4':
      resetCountdown();
      addMessage("カウントダウンをリセットします。", false);
      setTimeout(showDebugMenu, 1500);
      break;
    case '5':
      advanceCountdown();
      break;
    case '6':
      isDebugMode = false;
      skipToGoodEnd();
      break;
    case '7':
      isDebugMode = false;
      skipToTrueEnd();
      break;
    case '8':
      isDebugMode = false;
      textInput.disabled = true;
      sendButton.disabled = true;
      triggerBadEndStatus();
      break;
    case '9':
      isDebugMode = false;
      addMessage("デバッグメニューを終了します。", false);
      break;
    case '10':
      isDebugMode = false;
      skipToPassphrase();
      break;
    default:
      addMessage("0～10で入力して下さい", false);
      setTimeout(showDebugMenu, 1500);
  }
}

function setAllFlags() {
  const allFlags = new Set();
  validKeywords.forEach(item => {
    if (item.flagsSet) item.flagsSet.forEach(flag => allFlags.add(flag));
  });
  gameFlags.clear();
  allFlags.forEach(flag => gameFlags.add(flag));
}

function pauseCountdown() {
  if (countdownTimer) {
    clearTimeout(countdownTimer);
    countdownTimer = null;
    pauseTime = Date.now();
    console.log("カウントダウン停止: countdownTimer =", countdownTimer);
  }
}

function resumeCountdown() {
  if (pauseTime && startTime) {
    const elapsed = pauseTime - startTime;
    const remaining = 300000 - elapsed;
    if (remaining > 0) {
      countdownTimer = setTimeout(triggerBadEndStatus, remaining);
      console.log("カウントダウン再開: 残り時間 =", remaining / 1000, "秒");
    } else {
      textInput.disabled = true;
      sendButton.disabled = true;
      triggerBadEndStatus();
    }
  } else {
    addMessage("カウントダウンが開始されていないか、停止していません。", false);
    setTimeout(showDebugMenu, 1500);
  }
}

function resetCountdown() {
  if (countdownTimer) clearTimeout(countdownTimer);
  startTime = Date.now();
  pauseTime = null;
  countdownTimer = setTimeout(triggerBadEndStatus, 300000);
  console.log("カウントダウンリセット: 新しい開始時間 =", startTime);
}

async function skipToGoodEnd() {
  stopNoise();
  if (countdownTimer) {
    clearTimeout(countdownTimer);
    countdownTimer = null;
    console.log("カウントダウン停止: エンディングでタイマークリア");
  }
  currentLocation = "別会場";
  gameFlags.clear();
  gameFlags.add("合言葉_入力");
  gameFlags.add("合言葉_不成立");
  textInput.disabled = true;
  sendButton.disabled = true;

  const item = validKeywords.find(i => i.endGame === "good");
  const messages = [item.response, ...item.followUpMessages.map(m => m.text)];
  const delays = [800, ...item.followUpMessages.map(m => m.delay)];

  await sendMessageQueue(messages, delays, false, false, () => {
    started = false;
    textInput.disabled = true;
    sendButton.disabled = true;
    setTimeout(showDolphinMessage, 2000);
  });
}

async function skipToTrueEnd() {
  stopNoise();
  if (countdownTimer) {
    clearTimeout(countdownTimer);
    countdownTimer = null;
    console.log("カウントダウン停止: エンディングでタイマークリア");
  }
  currentLocation = "別会場";
  gameFlags.clear();
  gameFlags.add("合言葉_入力");
  gameFlags.add("合言葉_成功");
  textInput.disabled = true;
  sendButton.disabled = true;

  const item = validKeywords.find(i => i.endGame === "true");
  const messages = [item.response, ...item.followUpMessages.map(m => m.text)];
  const delays = [800, ...item.followUpMessages.map(m => m.delay)];

  await sendMessageQueue(messages, delays, false, false, () => {
    started = false;
    textInput.disabled = true;
    sendButton.disabled = true;
    setTimeout(showDolphinMessage, 2000);
  });
}

function skipToPassphrase() {
  stopNoise();
  if (countdownTimer) {
    clearTimeout(countdownTimer);
    countdownTimer = null;
    console.log("カウントダウン停止: 合言葉入力前スキップ");
  }
  currentLocation = "別会場";
  gameFlags.clear();
  gameFlags.add("スタッフ_遭遇");
  gameFlags.add("会場_案内");
  gameFlags.add("謎解き_開始");
  gameFlags.add("謎解き_進行");
  gameFlags.add("謎解き_完了");
  gameFlags.add("謎解き_終了");
  textInput.disabled = false;
  sendButton.disabled = false;

  const response = "スタッフさんがまた何か言ってます。…やっぱり聞き取れないですけど、どうやら…なにか合言葉…？を言ってほしいみたいです…。";
  addMessage(response, false);
  gameFlags.add("合言葉_入力");
}

async function advanceCountdown() {
  const elapsedBefore = startTime ? Date.now() - startTime : 0;
  const remainingBefore = 300000 - elapsedBefore;
  startTime = startTime ? startTime - 30000 : Date.now();
  const elapsedAfter = Date.now() - startTime;
  const remainingAfter = 300000 - elapsedAfter;

  if (elapsedBefore < 240000 && elapsedAfter >= 240000) {
    if (lateNoiseTimer) clearTimeout(lateNoiseTimer);
    lateNoiseTimer = null;
    startLateNoise();
    console.log("lateNoiseフラグ踏み: 残り時間 =", Math.ceil(remainingAfter / 1000), "秒");
  }
  if (elapsedBefore < 180000 && elapsedAfter >= 180000) {
    if (earlyNoiseTimer) clearTimeout(earlyNoiseTimer);
    earlyNoiseTimer = null;
    startEarlyNoise();
    console.log("earlyNoiseフラグ踏み: 残り時間 =", Math.ceil(remainingAfter / 1000), "秒");
  }

  if (countdownTimer) clearTimeout(countdownTimer);
  countdownTimer = null;
  if (remainingAfter <= 0) {
    textInput.disabled = true;
    sendButton.disabled = true;
    triggerBadEndStatus();
  } else {
    countdownTimer = setTimeout(triggerBadEndStatus, remainingAfter);
    await sendMessageQueue([`カウントダウンを30秒経過させます。残り時間は${Math.ceil(remainingAfter / 1000)}秒です。`], [1000]);
    setTimeout(showDebugMenu, 1500);
  }
  console.log("カウントダウン30秒経過: 残り時間 =", Math.ceil(remainingAfter / 1000), "秒");
}

async function handleMessage(text) {
  if (!started || textInput.disabled) return;
  const lower = text.toLowerCase();
  let matched = false;

  if (isDebugMode) {
    handleDebugCommand(lower);
    return;
  }

  if (lower === "デバッグ" || lower === "debug") {
    isDebugMode = true;
    showDebugMenu();
    return;
  }

  if (!locationUsedKeywordsMap.has(currentLocation)) {
    locationUsedKeywordsMap.set(currentLocation, new Set());
  }
  usedKeywords = locationUsedKeywordsMap.get(currentLocation);

  if (gameFlags.has('合言葉_入力')) {
    let normalizedText = text
      .replace(/[Ａ-Ｚａ-ｚ０-９]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFEE0))
      .replace(/\s+/g, ' ')
      .trim();
    const trueEndItem = validKeywords.find(item => item.endGame === "true");
    const goodEndItem = validKeywords.find(item => item.endGame === "good");

    if (!trueEndItem || !goodEndItem) {
      console.error("エンディングアイテムが見つかりません");
      addMessage("エラーが発生しました。ゲームをリセットしてください。", false);
      return;
    }

    const passphraseKeywords = trueEndItem.keywords || [];
    if (passphraseKeywords.includes(normalizedText)) {
      console.log("合言葉マッチ成功:", normalizedText);
      gameFlags.add("合言葉_成功");
      matched = true;
      if (!usedKeywords.has(trueEndItem.response)) {
        usedKeywords.add(trueEndItem.response);
        const messages = [trueEndItem.response, ...trueEndItem.followUpMessages.map(m => m.text)];
        const delays = [800, ...trueEndItem.followUpMessages.map(m => m.delay)];
        await sendMessageQueue(messages, delays, false, false, () => {
          started = false;
          if (countdownTimer) {
            clearTimeout(countdownTimer);
            countdownTimer = null;
            console.log("カウントダウン停止: トゥルーエンディング");
          }
          textInput.disabled = true;
          sendButton.disabled = true;
          setTimeout(showDolphinMessage, 2000);
        });
      }
      return;
    } else {
      console.log("合言葉マッチング失敗:", normalizedText);
      passphraseAttempts++;
      if (passphraseAttempts === 1) {
        addMessage("うーん、違うみたいです…あともう1回だけなら、聞いてもらえそうです…", false);
      } else if (passphraseAttempts >= 2) {
        gameFlags.add("合言葉_不成立");
        matched = true;
        if (!usedKeywords.has(goodEndItem.response)) {
          usedKeywords.add(goodEndItem.response);
          const messages = [goodEndItem.response, ...goodEndItem.followUpMessages.map(m => m.text)];
          const delays = [800, ...goodEndItem.followUpMessages.map(m => m.delay)];
          await sendMessageQueue(messages, delays, false, false, () => {
            started = false;
            if (countdownTimer) {
              clearTimeout(countdownTimer);
              countdownTimer = null;
              console.log("カウントダウン停止: グッドエンディング");
            }
            textInput.disabled = true;
            sendButton.disabled = true;
            setTimeout(showDolphinMessage, 2000);
          });
        }
        return;
      }
    }
  }

  for (const item of validKeywords) {
    const matchesKeyword = item.keywords.some(k => lower.includes(k.toLowerCase()));
    const matchesLocation = !item.locations || item.locations.includes(currentLocation);
    const hasRequiredFlags = !item.flagsRequired || item.flagsRequired.every(f => gameFlags.has(f));
    const hasNoExcludedFlags = !item.flagsExcluded || item.flagsExcluded.every(f => !gameFlags.has(f));
    const isNotUsed = !item.once || !usedKeywords.has(item.response);

    if (matchesKeyword && matchesLocation && hasRequiredFlags && hasNoExcludedFlags && isNotUsed) {
      matched = true;
      usedKeywords.add(item.response);
      const messages = [item.response];
      const delays = [800];
      const followUpMessages = item.followUpMessages || [];
      followUpMessages.forEach(fm => {
        if (!usedKeywords.has(fm.text)) {
          messages.push(fm.text);
          delays.push(fm.delay || 1000);
          usedKeywords.add(fm.text);
        }
      });

      await sendMessageQueue(messages, delays, false, false, async () => {
        if (item.flagsSet) {
          item.flagsSet.forEach(flag => gameFlags.add(flag));
          if (item.flagsSet.includes('自撮り_送信')) {
            addImageMessage('data/img/mayuri_selfie.jpg');
            await sendMessageQueue(["はい、どうぞ…！なんだか恥ずかしいですね…！"], [1000]);
          }
        }

        if (item.changeLocation && currentLocation !== item.changeLocation) {
          locationUsedKeywordsMap.set(currentLocation, usedKeywords);
          currentLocation = item.changeLocation;
          if (!locationUsedKeywordsMap.has(currentLocation)) {
            locationUsedKeywordsMap.set(currentLocation, new Set());
          }
          usedKeywords = locationUsedKeywordsMap.get(currentLocation);
        }

        if (item.endGame === 'good' || item.endGame === 'true') {
          stopNoise();
          textInput.disabled = true;
          sendButton.disabled = true;
          const messages = item.followUpMessages.map(m => m.text);
          const delays = item.followUpMessages.map(m => m.delay);
          await sendMessageQueue(messages, delays, false, false, () => {
            started = false;
            if (countdownTimer) {
              clearTimeout(countdownTimer);
            }
            countdownTimer = null;
            console.log(`カウントダウン停止: ${item.endGame}エンディング`);
          });
          textInput.disabled = true;
          sendButton.disabled = true;
          setTimeout(showDolphinMessage, 2000);
        } else if (item.endGame === 'bad') {
          stopNoise();
          textInput.disabled = true;
          sendButton.disabled = true;
          triggerBadEndStatus();
        }
      });
      break;
    }
  }

  if (!matched) {
    const responses = [
      "…え、なんでしょう？どういう意味でしょうか…？",
      "…何か他にないですか？怖いよう…",
      "…うーんうーん…何かヒントをください…！",
      "…ごめんなさい、よくわからないです…もう少し詳しく教えてくれますか？",
      "…うう、頭が混乱してきちゃいました…何か手がかりを…！",
      "…それだとちょっと難しいかも…もう少しわかりやすくお願いします…！"
    ];
    addMessage(responses[Math.floor(Math.random() * responses.length)], false);
  }
}

sendButton.addEventListener('click', () => {
  const text = textInput.value.trim();
  if (!text || isSpeaking) return;
  addMessage(text, true);
  textInput.value = '';

  if (!started) {
    startGame();
    return;
  }

  handleMessage(text);
});

textInput.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !sendButton.disabled) sendButton.click();
});

textInput.disabled = true;
sendButton.disabled = true;
showIntro();