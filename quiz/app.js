import { subjects } from './questions.js';

// --- 상태 관리 변수 ---
let currentScreen = 'screen-lobby';
let difficulty = 'easy'; // 'easy' | 'normal' | 'hard'
let currentSubject = 'safety'; // 'safety' | 'train'
let questionCountMode = 'all'; // 'all' | '10'
let questionsList = [];
let currentQuestionIndex = 0;
let score = 0;
let correctCount = 0;
let incorrectQuestions = [];
let isAnswered = false;

// 타이머 변수 (매운맛 전용)
let timerInterval = null;
let timerRemaining = 15; // 15초 제한
const LIMIT_SECONDS = 15;

// 교육 모드 캐러셀 상태
let studyCardIndex = 0;

// --- DOM 요소 참조 ---
const screens = {
  lobby: document.getElementById('screen-lobby'),
  education: document.getElementById('screen-education'),
  quiz: document.getElementById('screen-quiz'),
  results: document.getElementById('screen-results')
};

// 로비 요소
const diffButtons = document.querySelectorAll('.diff-options .diff-btn');
const lobbyDiffDesc = document.getElementById('lobby-diff-desc');
const btnLobbyStartQuiz = document.getElementById('btn-lobby-start-quiz');
const btnLobbyEducation = document.getElementById('btn-lobby-education');
const btnOpenCheat = document.getElementById('btn-open-cheat');
const btnCloseCheat = document.getElementById('btn-close-cheat');
const cheatSheetOverlay = document.getElementById('cheat-sheet-overlay');
const cheatSheetBody = document.getElementById('cheat-sheet-body');

// 교육 모드 요소
const studyCarousel = document.getElementById('study-carousel');
const btnEduPrev = document.getElementById('btn-edu-prev');
const btnEduNext = document.getElementById('btn-edu-next');
const carouselIndicators = document.getElementById('carousel-indicators');
const btnEduBack = document.getElementById('btn-edu-back');
const btnEduOpenCheat = document.getElementById('btn-edu-open-cheat');

// 퀴즈 요소
const quizCategory = document.getElementById('quiz-category');
const quizProgressText = document.getElementById('quiz-progress-text');
const quizProgressFill = document.getElementById('quiz-progress-fill');
const quizTimerContainer = document.getElementById('quiz-timer-container');
const quizTimerFill = document.getElementById('quiz-timer-fill');
const quizPanelCard = document.getElementById('quiz-panel-card');
const btnQuizHint = document.getElementById('btn-quiz-hint');
const btnQuizExit = document.getElementById('btn-quiz-exit');
const quizQuestion = document.getElementById('quiz-question');
const quizOptionsContainer = document.getElementById('quiz-options');

// 해설 시트 요소
const explanationSheet = document.getElementById('explanation-sheet');
const sheetStatus = document.getElementById('sheet-status');
const sheetCorrectAnswer = document.getElementById('sheet-correct-answer');
const sheetExplanation = document.getElementById('sheet-explanation');
const btnSheetNext = document.getElementById('btn-sheet-next');
const btnSheetClose = document.getElementById('btn-sheet-close');

// 결과 요소
const btnResultsLobby = document.getElementById('btn-results-lobby');
const resultGrade = document.getElementById('result-grade');
const resultGradeBadge = document.getElementById('result-grade-badge');
const resultScore = document.getElementById('result-score');
const resultMessage = document.getElementById('result-message');
const statCorrectCount = document.getElementById('stat-correct-count');
const statDifficulty = document.getElementById('stat-difficulty');
const btnRetryIncorrect = document.getElementById('btn-retry-incorrect');
const btnRestartQuiz = document.getElementById('btn-restart-quiz');
const btnBackToLobby = document.getElementById('btn-back-to-lobby');

// --- 초기화 작업 ---
window.addEventListener('DOMContentLoaded', () => {
  initLobby();
  initCheatSheet();
  initEducationEvents();
  renderEducation();
  initQuizEvents();
  initResultsEvents();
});

// --- 화면 전환 함수 ---
function showScreen(screenId) {
  // 모든 화면 숨김
  Object.values(screens).forEach(screen => {
    screen.classList.remove('active');
  });

  // 목표 화면 활성화
  const target = document.getElementById(screenId);
  if (target) {
    target.classList.add('active');
    currentScreen = screenId;
  }

  // 화면 전환 시 열려있던 시트 닫기
  closeExplanationSheet();
}

// --- 족보 오버레이 요약본 초기화 및 설정 ---
function initCheatSheet() {
  renderCheatSheet();

  // 최초 1회만 이벤트 등록
  if (!initCheatSheet.initialized) {
    btnOpenCheat.addEventListener('click', () => cheatSheetOverlay.classList.add('active'));
    btnEduOpenCheat.addEventListener('click', () => cheatSheetOverlay.classList.add('active'));
    btnCloseCheat.addEventListener('click', () => cheatSheetOverlay.classList.remove('active'));
    
    // 바깥 영역 클릭 시 닫기
    cheatSheetOverlay.addEventListener('click', (e) => {
      if (e.target === cheatSheetOverlay) {
        cheatSheetOverlay.classList.remove('active');
      }
    });
    initCheatSheet.initialized = true;
  }
}

function renderCheatSheet() {
  const currentStudySections = subjects[currentSubject].studySections;
  // 족보 내용 동적 삽입
  let html = '';
  currentStudySections.forEach(section => {
    html += `
      <div style="margin-bottom: 24px; border-bottom: 1.5px dashed rgba(255,255,255,0.08); padding-bottom: 20px;">
        <h4 style="color: var(--neon-orange); font-size: 0.95rem; margin-bottom: 8px; font-weight: 800;">${section.title}</h4>
        <div style="display: flex; flex-direction: column; gap: 10px;">
    `;
    section.details.forEach(detail => {
      html += `
        <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05); padding: 12px; border-radius: 12px;">
          <div style="font-weight: 700; font-size: 0.85rem; color: var(--neon-cyan); margin-bottom: 4px;">• ${detail.keyword}</div>
          <div style="font-size: 0.8rem; line-height: 1.45; color: rgba(255,255,255,0.85);">${detail.text}</div>
        </div>
      `;
    });
    html += `</div></div>`;
  });
  cheatSheetBody.innerHTML = html;
}

// --- 로비 화면 기능 설정 ---
function initLobby() {
  // 과목 선택 버튼 이벤트 등록
  const subButtons = document.querySelectorAll('.subject-options .diff-btn');
  const lobbyTitle = document.getElementById('lobby-main-title');
  const lobbyDesc = document.getElementById('lobby-main-desc');

  subButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      subButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentSubject = btn.getAttribute('data-subject');

      // 과목별 헤더 텍스트 변경
      if (currentSubject === 'safety') {
        lobbyTitle.innerHTML = "철도 기말고사<br>유출 족보 퀴즈";
        lobbyDesc.innerHTML = "교수님이 대놓고 짚어주신 25가지 족보!<br>노베이스 상태에서 완벽대비해 드립니다.";
      } else {
        lobbyTitle.innerHTML = "전기동차 제어 기말고사<br>유출 족보 퀴즈";
        lobbyDesc.innerHTML = "제어 알고리즘 38선 및 주관식 4선 완벽 수록!<br>노베이스 상태에서 마스터해 드립니다.";
      }

      // 족보 내용 및 과외 카드 갱신
      initCheatSheet();
      renderEducation();
    });
  });

  // 난이도 버튼 클릭 이벤트 등록
  diffButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      diffButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      difficulty = btn.getAttribute('data-level');

      // 설명글 교체
      if (difficulty === 'easy') {
        lobbyDiffDesc.textContent = "시간 제한이 없으며, 문제를 푸는 중에 '교수님 뇌피셜 팁(힌트)'을 실시간으로 확인하며 공부할 수 있습니다.";
      } else if (difficulty === 'normal') {
        lobbyDiffDesc.textContent = "일반적인 시험 모드입니다. 제한 시간이 없으며, 정답 혹은 오답을 클릭한 후에만 교수님 팁(해설)이 노출됩니다.";
      } else if (difficulty === 'hard') {
        lobbyDiffDesc.textContent = "🔥 매운맛! 교수님 복수 모드. 문항당 제한 시간 15초가 작동하며, 시간 초과 시 가차없이 오답 처리 후 넘어갑니다.";
      }
    });
  });

  // 문항 수 선택 버튼 이벤트 등록
  const countButtons = document.querySelectorAll('.question-count-options .diff-btn');
  countButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      countButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      questionCountMode = btn.getAttribute('data-count');
    });
  });

  // 교육 시작
  btnLobbyEducation.addEventListener('click', () => {
    showScreen('screen-education');
    setTimeout(() => {
      if (studyCarousel) studyCarousel.scrollLeft = 0;
      updateIndicators(0);
    }, 50);
  });

  // 퀴즈 시작
  btnLobbyStartQuiz.addEventListener('click', () => {
    startQuiz(false);
  });
}

// --- 교육 모드 기능 설정 ---
function initEducationEvents() {
  // 수평 스크롤 위치에 따른 인디케이터 및 버튼 갱신
  studyCarousel.addEventListener('scroll', () => {
    const width = studyCarousel.clientWidth || 350;
    const index = Math.round(studyCarousel.scrollLeft / width);
    const currentStudySections = subjects[currentSubject].studySections;
    if (index !== studyCardIndex && index >= 0 && index < currentStudySections.length) {
      updateIndicators(index);
    }
  });

  // 이전/다음 버튼 이벤트
  btnEduPrev.addEventListener('click', () => {
    if (studyCardIndex > 0) {
      loadEducationCard(studyCardIndex - 1);
    }
  });

  btnEduNext.addEventListener('click', () => {
    const currentStudySections = subjects[currentSubject].studySections;
    if (studyCardIndex < currentStudySections.length - 1) {
      loadEducationCard(studyCardIndex + 1);
    }
  });

  // 인디케이터 클릭 이벤트
  carouselIndicators.addEventListener('click', (e) => {
    const dot = e.target.closest('.indicator-dot');
    if (dot) {
      const index = parseInt(dot.getAttribute('data-index'));
      loadEducationCard(index);
    }
  });

  // 로비로 돌아가기
  btnEduBack.addEventListener('click', () => {
    showScreen('screen-lobby');
  });

  // 마지막 카드의 바로 풀기 단추 바인딩 (이벤트 위임)
  studyCarousel.addEventListener('click', (e) => {
    const target = e.target.closest('#btn-edu-direct-quiz');
    if (target) {
      startQuiz(false);
    }
  });
}

function renderEducation() {
  const currentStudySections = subjects[currentSubject].studySections;
  // 교육 카드 동적 렌더링
  let cardHtml = '';
  let dotHtml = '';

  currentStudySections.forEach((section, index) => {
    let detailsHtml = '';
    section.details.forEach(detail => {
      detailsHtml += `
        <div class="detail-item">
          <div class="keyword">💡 ${detail.keyword}</div>
          <div class="text">${detail.text}</div>
        </div>
      `;
    });

    cardHtml += `
      <div id="study-card-${index}" class="study-card">
        <span class="zone-badge">구역 0${section.id}</span>
        <h2>${section.title}</h2>
        <h3>${section.subtitle}</h3>
        <p class="intro">${section.description}</p>
        <div class="study-details-list">
          ${detailsHtml}
        </div>
        ${index === currentStudySections.length - 1 ? `
          <button id="btn-edu-direct-quiz" class="btn-primary btn-start-quiz" style="margin-top: 24px;">
            📖 공부 완료! 바로 시험치기
          </button>
        ` : ''}
      </div>
    `;

    dotHtml += `<div class="indicator-dot ${index === 0 ? 'active' : ''}" data-index="${index}"></div>`;
  });

  studyCarousel.innerHTML = cardHtml;
  carouselIndicators.innerHTML = dotHtml;

  // 상태 리셋
  studyCarousel.scrollLeft = 0;
  updateIndicators(0);
}

function loadEducationCard(index) {
  const width = studyCarousel.clientWidth || 350;
  studyCarousel.scrollTo({
    left: index * width,
    behavior: 'smooth'
  });
  updateIndicators(index);
}

function updateIndicators(index) {
  const dots = document.querySelectorAll('.indicator-dot');
  dots.forEach((dot, idx) => {
    dot.classList.toggle('active', idx === index);
  });

  studyCardIndex = index;

  // 버튼 활성상태 조절
  btnEduPrev.disabled = index === 0;
  btnEduNext.disabled = index === subjects[currentSubject].studySections.length - 1;
}

// --- 퀴즈 모드 로직 ---
function initQuizEvents() {
  // 보기 버튼 이벤트 바인딩
  const optionBtns = quizOptionsContainer.querySelectorAll('.option-btn');
  optionBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const index = parseInt(btn.getAttribute('data-index'));
      selectAnswer(index);
    });
  });

  // 힌트 버튼 클릭
  btnQuizHint.addEventListener('click', () => {
    openExplanationSheet(null, true); // 힌트 모드로 해설창 열기
  });

  // 힌트 닫기 버튼 클릭
  btnSheetClose.addEventListener('click', () => {
    closeExplanationSheet();
  });

  // 퀴즈 포기하고 로비로 탈출
  btnQuizExit.addEventListener('click', () => {
    if (timerInterval) clearInterval(timerInterval);
    showScreen('screen-lobby');
  });

  // 다음 문제 버튼
  btnSheetNext.addEventListener('click', () => {
    closeExplanationSheet();
    goToNextQuestion();
  });
}

function startQuiz(isRetryIncorrect = false) {
  if (isRetryIncorrect) {
    // 오답 리스트로 퀴즈 셋 설정
    questionsList = [...incorrectQuestions];
  } else {
    // 과목 및 난이도에 따른 퀴즈 리스트 설정
    const targetSubject = subjects[currentSubject];
    let rawQuestions = [];
    if (difficulty === 'hard') {
      rawQuestions = [...targetSubject.hardQuestions];
    } else {
      rawQuestions = [...targetSubject.easyQuestions];
    }

    // 1. 전체 질문 무작위 셔플링
    let shuffledQuestions = shuffleArray(rawQuestions);

    // 2. 10문제만 풀기 설정 시 10개 추출
    if (questionCountMode === '10') {
      shuffledQuestions = shuffledQuestions.slice(0, 10);
    }

    // 3. 각 질문의 보기 목록 셔플 및 정답 인덱스 갱신
    questionsList = shuffledQuestions.map(q => {
      const clonedQ = { ...q, options: [...q.options] };
      const correctAnswerText = clonedQ.options[clonedQ.answer];
      
      clonedQ.options = shuffleArray(clonedQ.options);
      clonedQ.answer = clonedQ.options.indexOf(correctAnswerText);
      return clonedQ;
    });
  }

  currentQuestionIndex = 0;
  score = 0;
  correctCount = 0;
  incorrectQuestions = []; // 새로운 오답 목록 수집 준비
  isAnswered = false;

  // 타이머 세팅
  if (difficulty === 'hard') {
    quizTimerContainer.style.display = 'block';
  } else {
    quizTimerContainer.style.display = 'none';
  }

  // 힌트 버튼 세팅
  if (difficulty === 'easy') {
    btnQuizHint.style.display = 'block';
  } else {
    btnQuizHint.style.display = 'none';
  }

  showScreen('screen-quiz');
  loadQuestion();
}

function loadQuestion() {
  isAnswered = false;
  const qData = questionsList[currentQuestionIndex];

  // 질문 정보 삽입
  quizCategory.textContent = qData.category;
  quizProgressText.textContent = `${currentQuestionIndex + 1} / ${questionsList.length}`;
  
  // 프로그레스 바 갱신
  const progressPercent = ((currentQuestionIndex) / questionsList.length) * 100;
  quizProgressFill.style.style = `width: ${progressPercent}%`; // 사소한 오타 방지
  quizProgressFill.style.width = `${progressPercent}%`;

  // 문제 및 보기 삽입
  quizQuestion.textContent = qData.question;
  const optionBtns = quizOptionsContainer.querySelectorAll('.option-btn');
  
  optionBtns.forEach((btn, idx) => {
    btn.classList.remove('correct', 'incorrect');
    btn.disabled = false;
    
    // 보기 텍스트 설정
    const textNode = btn.querySelector('.option-text');
    textNode.textContent = qData.options[idx];
  });

  // 타이머 작동 (매운맛)
  if (difficulty === 'hard') {
    startTimer();
  }
}

function startTimer() {
  clearInterval(timerInterval);
  timerRemaining = LIMIT_SECONDS;
  updateTimerUI();

  timerInterval = setInterval(() => {
    timerRemaining--;
    updateTimerUI();

    if (timerRemaining <= 0) {
      clearInterval(timerInterval);
      handleTimeout();
    }
  }, 1000);
}

function updateTimerUI() {
  const percent = (timerRemaining / LIMIT_SECONDS) * 100;
  quizTimerFill.style.width = `${percent}%`;

  // 시간 임박(5초 이하) 시 빨간 경고색
  if (timerRemaining <= 5) {
    quizTimerFill.classList.add('warning');
  } else {
    quizTimerFill.classList.remove('warning');
  }
}

function selectAnswer(selectedIndex) {
  if (isAnswered) return;
  isAnswered = true;

  // 타이머 중지
  if (timerInterval) clearInterval(timerInterval);

  const qData = questionsList[currentQuestionIndex];
  const optionBtns = quizOptionsContainer.querySelectorAll('.option-btn');

  // 모든 보기 비활성화
  optionBtns.forEach(btn => btn.disabled = true);

  const isCorrect = selectedIndex === qData.answer;

  if (isCorrect) {
    // 정답 피드백
    optionBtns[selectedIndex].classList.add('correct');
    correctCount++;
    openExplanationSheet('correct');
  } else {
    // 오답 피드백
    optionBtns[selectedIndex].classList.add('incorrect');
    optionBtns[qData.answer].classList.add('correct');
    incorrectQuestions.push(qData);
    
    // 카드 흔들림 애니메이션 효과
    quizPanelCard.classList.add('shake-animation');
    setTimeout(() => {
      quizPanelCard.classList.remove('shake-animation');
    }, 400);

    openExplanationSheet('incorrect', false, qData.options[selectedIndex]);
  }
}

function handleTimeout() {
  if (isAnswered) return;
  isAnswered = true;

  const qData = questionsList[currentQuestionIndex];
  const optionBtns = quizOptionsContainer.querySelectorAll('.option-btn');

  // 모든 보기 비활성화 및 정답만 표시
  optionBtns.forEach(btn => btn.disabled = true);
  optionBtns[qData.answer].classList.add('correct');
  
  incorrectQuestions.push(qData);

  // 패널 흔들림 피드백
  quizPanelCard.classList.add('shake-animation');
  setTimeout(() => {
    quizPanelCard.classList.remove('shake-animation');
  }, 400);

  openExplanationSheet('timeout');
}

// --- 해설 바텀 시트 제어 ---
function openExplanationSheet(status, isHintOnly = false, userSelectedText = '') {
  const qData = questionsList[currentQuestionIndex];

  if (isHintOnly) {
    sheetStatus.textContent = "💡 족보 힌트 (미리보기)";
    sheetStatus.className = "sheet-status-badge correct"; // 초록 테마
    sheetCorrectAnswer.style.display = 'none';
    sheetExplanation.innerHTML = qData.tip;
    btnSheetNext.style.display = 'none'; // 힌트 모드에선 다음버튼 숨김
    btnSheetClose.style.display = 'block'; // 힌트 닫기 버튼 보이기
  } else {
    sheetCorrectAnswer.style.display = 'block';
    btnSheetNext.style.display = 'flex'; // 다음버튼 복원
    btnSheetClose.style.display = 'none'; // 일반 모드에선 닫기버튼 숨김
    sheetExplanation.innerHTML = qData.tip;

    if (status === 'correct') {
      sheetStatus.textContent = "정답입니다! 🎉";
      sheetStatus.className = "sheet-status-badge correct";
      sheetCorrectAnswer.innerHTML = `
        <div class="answer-comparison-container" style="border-color: rgba(57, 255, 20, 0.2); background: rgba(57, 255, 20, 0.03);">
          <div class="answer-line correct-final" style="border: none; padding: 0; margin: 0;">
            <span>🎯 내가 맞춘 정답</span>
            <span class="ans-val">${qData.options[qData.answer]}</span>
          </div>
        </div>
      `;
    } else if (status === 'incorrect') {
      sheetStatus.textContent = "오답입니다! 😢";
      sheetStatus.className = "sheet-status-badge incorrect";
      sheetCorrectAnswer.innerHTML = `
        <div class="answer-comparison-container">
          <div class="answer-line user-wrong">
            <span>내가 고른 답</span>
            <span class="ans-val">${userSelectedText}</span>
          </div>
          <div class="answer-line correct-final">
            <span>🎯 진짜 정답</span>
            <span class="ans-val">${qData.options[qData.answer]}</span>
          </div>
        </div>
      `;
    } else if (status === 'timeout') {
      sheetStatus.textContent = "시간 초과! ⏱️";
      sheetStatus.className = "sheet-status-badge timeout";
      sheetCorrectAnswer.innerHTML = `
        <div class="answer-comparison-container" style="border-color: rgba(255, 159, 28, 0.2); background: rgba(255, 159, 28, 0.03);">
          <div class="answer-line correct-final" style="border: none; padding: 0; margin: 0;">
            <span>🎯 놓친 진짜 정답</span>
            <span class="ans-val">${qData.options[qData.answer]}</span>
          </div>
        </div>
      `;
    }
  }

  explanationSheet.classList.add('active');
}

function closeExplanationSheet() {
  explanationSheet.classList.remove('active');
  btnSheetClose.style.display = 'none';
}

function goToNextQuestion() {
  currentQuestionIndex++;
  if (currentQuestionIndex < questionsList.length) {
    loadQuestion();
  } else {
    showResults();
  }
}

// --- 결과 화면 로직 ---
function initResultsEvents() {
  btnResultsLobby.addEventListener('click', () => showScreen('screen-lobby'));
  btnBackToLobby.addEventListener('click', () => showScreen('screen-lobby'));
  
  // 틀린 문제만 다시 풀기
  btnRetryIncorrect.addEventListener('click', () => {
    startQuiz(true);
  });

  // 이 난이도로 처음부터 다시 풀기
  btnRestartQuiz.addEventListener('click', () => {
    startQuiz(false);
  });
}

function showResults() {
  const totalQuestions = questionsList.length;
  // 100점 만점으로 비례 계산
  const finalScore = Math.round((correctCount / totalQuestions) * 100);

  resultScore.textContent = finalScore;
  statCorrectCount.textContent = `${correctCount} / ${totalQuestions}`;
  
  // 난이도 텍스트 매핑
  let diffText = '순한맛 (쉬움)';
  if (difficulty === 'normal') diffText = '보통맛 (보통)';
  if (difficulty === 'hard') diffText = '🌶️ 매운맛 (복수)';
  statDifficulty.textContent = diffText;

  // 등급 산출 (F -> '재수강')
  resultGradeBadge.className = 'grade-badge-container'; // 초기화
  
  if (finalScore >= 95) {
    resultGrade.textContent = 'A+';
    resultGradeBadge.classList.add('grade-a');
    resultMessage.innerHTML = "교수님께 완벽하게 복수했습니다! <b>A+ 획득 성공!</b><br>시험장에 가볍게 들어가서 조지고 나오세요!";
  } else if (finalScore >= 80) {
    resultGrade.textContent = 'A';
    resultGradeBadge.classList.add('grade-a');
    resultMessage.innerHTML = "아주 훌륭한 성적입니다! <b>무난히 A학점 통과!</b><br>틀린 부분을 족보집에서 조금만 보완하면 100점입니다.";
  } else if (finalScore >= 70) {
    resultGrade.textContent = 'B';
    resultMessage.innerHTML = "교수님의 목표점수(평균 70점)에 도달했습니다!<br>안정적인 패스라인입니다. 조금 더 고득점을 위해 노력해 보세요.";
  } else {
    // 70점 미만 시 F 대신 '재수강' 출력
    resultGrade.textContent = '재수강';
    resultGradeBadge.classList.add('grade-fail');
    resultMessage.innerHTML = "앗... 이대로 시험장에 가면 <b>재수강 각</b>입니다.<br>아래 '노베이스 과외'를 듣고 다시 시험을 쳐 보세요!";
  }

  // 틀린 문제 재도전 버튼 제어
  if (incorrectQuestions.length > 0) {
    btnRetryIncorrect.style.display = 'flex';
    btnRetryIncorrect.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="m15 18-6-6 6-6"/>
      </svg>
      오답 ${incorrectQuestions.length}개만 다시 풀기
    `;
  } else {
    btnRetryIncorrect.style.display = 'none';
  }

  showScreen('screen-results');
}

// --- 배열 무작위 셔플 헬퍼 함수 ---
function shuffleArray(array) {
  const newArr = [...array];
  for (let i = newArr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
  }
  return newArr;
}
