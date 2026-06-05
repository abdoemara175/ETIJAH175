// ==============================
// ETIJAH175 - App Controller
// Principle: Decision → Execution (No Negotiation)
// ==============================

class AppController {
  constructor(engine) {
    this.engine = engine;
    this.currentMode = "all";
    this.isExecuting = false;
    this.init();
  }

  init() {
    this.bindEvents();
    this.updateStats();
    this.updateTimeDisplay();
    setInterval(() => this.updateTimeDisplay(), 60000);
  }

  bindEvents() {
    // Primary action - THE ONLY BUTTON THAT MATTERS
    const generateBtn = document.getElementById("generateBtn");
    if (generateBtn) {
      generateBtn.addEventListener("click", () => this.handleGenerate());
    }

    // Confirmation buttons - MUST RESPOND
    const doneBtn = document.getElementById("doneBtn");
    const skipBtn = document.getElementById("skipBtn");
    const failBtn = document.getElementById("failBtn");

    if (doneBtn) doneBtn.addEventListener("click", () => this.handleConfirm("DONE"));
    if (skipBtn) skipBtn.addEventListener("click", () => this.handleConfirm("SKIP"));
    if (failBtn) failBtn.addEventListener("click", () => this.handleConfirm("FAILED"));

    // Mode buttons
    const emergencyBtn = document.getElementById("emergencyBtn");
    const missionsBtn = document.getElementById("missionsBtn");
    const actionsBtn = document.getElementById("actionsBtn");

    if (emergencyBtn) emergencyBtn.addEventListener("click", () => this.activateEmergencyMode());
    if (missionsBtn) missionsBtn.addEventListener("click", () => this.setMode("missions"));
    if (actionsBtn) actionsBtn.addEventListener("click", () => this.setMode("actions"));

    // Reset button
    const resetBtn = document.getElementById("resetBtn");
    if (resetBtn) {
      resetBtn.addEventListener("click", () => {
        if (confirm("هل أنت متأكد من رغبتك في إعادة تعيين جميع البيانات؟")) {
          this.engine.reset();
          this.updateStats();
          alert("تم إعادة تعيين البيانات.");
        }
      });
    }
  }

  // ==============================
  // GENERATE - THE DECISION MOMENT
  // ==============================
  handleGenerate() {
    // Generate the decision
    const item = this.engine.generate();

    if (!item) {
      alert("خطأ: لا توجد عناصر متاحة");
      return;
    }

    // Display it prominently
    this.renderItem(item);
    
    // Show confirmation buttons
    this.showConfirmationButtons();
    
    // Update stats
    this.updateStats();
    this.updateStateDisplay();

    // Focus on the output
    const output = document.getElementById("output");
    if (output) {
      output.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }

  // ==============================
  // RENDER - MAKE IT CLEAR
  // ==============================
  renderItem(item) {
    const output = document.getElementById("output");
    if (!output) return;

    const itemType = item.type === "mission" ? "🎯 مهمة" : "⚡ إجراء";
    const duration = item.duration ? `${item.duration} دقيقة` : "-";
    const intensity = item.intensity ? this.translateIntensity(item.intensity) : "-";

    let html = `
      <div class="output-content">
        <h2>${item.title || item.action}</h2>
        
        <div class="output-meta">
          <p><b>النوع:</b> ${itemType}</p>
          <p><b>الهدف:</b> ${item.goal || "-"}</p>
          <p><b>الحالة:</b> ${this.translateState(this.engine.currentState)}</p>
          <p><b>الشدة:</b> ${intensity}</p>
        </div>
    `;

    if (item.duration) {
      html += `<p><b>المدة:</b> ${duration}</p>`;
    }

    html += `
        <p class="success-condition"><b>شرط النجاح:</b> ${item.success_condition || "-"}</p>
    `;

    if (item.guidance) {
      html += `<p class="guidance"><b>التوجيه:</b> ${item.guidance}</p>`;
    }

    html += `</div>`;

    output.innerHTML = html;
    output.classList.add("active");
  }

  // ==============================
  // SHOW CONFIRMATION - NO ESCAPE
  // ==============================
  showConfirmationButtons() {
    const confirmSection = document.getElementById("confirmSection");
    if (confirmSection) {
      confirmSection.style.display = "grid";
    }
  }

  hideConfirmationButtons() {
    const confirmSection = document.getElementById("confirmSection");
    if (confirmSection) {
      confirmSection.style.display = "none";
    }
  }

  // ==============================
  // CONFIRM - RECORD THE RESULT
  // ==============================
  handleConfirm(status) {
    const result = this.engine.confirm(status);

    // Show feedback
    const message = result.message;
    console.log(message);

    // Visual feedback
    this.showFeedback(status, message);

    // Hide buttons
    this.hideConfirmationButtons();

    // Update stats
    this.updateStats();
    this.updateStateDisplay();
  }

  showFeedback(status, message) {
    const output = document.getElementById("output");
    if (!output) return;

    let feedbackClass = "";
    let icon = "";

    if (status === "DONE") {
      feedbackClass = "feedback-done";
      icon = "✓";
    } else if (status === "SKIP") {
      feedbackClass = "feedback-skip";
      icon = "⊘";
    } else if (status === "FAILED") {
      feedbackClass = "feedback-failed";
      icon = "✗";
    }

    const feedback = document.createElement("div");
    feedback.className = `feedback ${feedbackClass}`;
    feedback.innerHTML = `<span>${icon}</span> <span>${message}</span>`;

    output.appendChild(feedback);

    // Auto-hide after 2 seconds
    setTimeout(() => {
      feedback.style.opacity = "0";
      setTimeout(() => feedback.remove(), 300);
    }, 2000);
  }

  // ==============================
  // MODES
  // ==============================
  setMode(mode) {
    this.currentMode = mode;
    const missionsBtn = document.getElementById("missionsBtn");
    const actionsBtn = document.getElementById("actionsBtn");

    if (missionsBtn) {
      missionsBtn.style.opacity = mode === "missions" ? "1" : "0.5";
    }
    if (actionsBtn) {
      actionsBtn.style.opacity = mode === "actions" ? "1" : "0.5";
    }
  }

  activateEmergencyMode() {
    const antiAddictionActions = Array.isArray(this.engine.actions)
      ? this.engine.actions.filter(a => a.category === "anti_addiction")
      : [];

    if (antiAddictionActions.length === 0) {
      alert("لا توجد إجراءات مضادة للإدمان متاحة.");
      return;
    }

    const chosen = antiAddictionActions[Math.floor(Math.random() * antiAddictionActions.length)];
    this.renderItem({ ...chosen, type: "action" });
    this.showConfirmationButtons();

    // Update state badge
    this.updateStateDisplay();
  }

  // ==============================
  // STATS & DISPLAY
  // ==============================
  updateStats() {
    const stats = this.engine.getStats();

    const historyCount = document.getElementById("historyCount");
    const streakCount = document.getElementById("streakCount");

    if (historyCount) {
      historyCount.textContent = stats.total;
    }

    if (streakCount) {
      streakCount.textContent = stats.streak;
    }
  }

  updateTimeDisplay() {
    const timeDisplay = document.getElementById("timeDisplay");
    if (timeDisplay) {
      const now = new Date();
      timeDisplay.textContent = now.toLocaleTimeString("ar-SA", {
        hour: "2-digit",
        minute: "2-digit"
      });
    }
  }

  updateStateDisplay() {
    const stateBadge = document.getElementById("stateDisplay");
    if (!stateBadge) return;

    const state = this.engine.currentState;
    const stateText = this.translateState(state);
    const stateClass = state.toLowerCase();

    stateBadge.textContent = stateText;
    stateBadge.className = `state-badge ${stateClass}`;
  }

  // ==============================
  // TRANSLATIONS
  // ==============================
  translateState(state) {
    const stateMap = {
      "IDLE": "خامل",
      "FOCUSED": "مركز",
      "DISTRACTED": "مشتت",
      "URGE": "إجهاد"
    };
    return stateMap[state] || state;
  }

  translateIntensity(intensity) {
    const intensityMap = {
      "low": "منخفضة",
      "medium": "متوسطة",
      "high": "عالية"
    };
    return intensityMap[intensity] || intensity;
  }
}

// ==============================
// INITIALIZE APP
// ==============================

let appInitialized = false;
let initAttempts = 0;
const maxAttempts = 30;

function initApp() {
  if (typeof engine === "undefined") {
    if (initAttempts < maxAttempts) {
      initAttempts++;
      setTimeout(initApp, 500);
    }
    return;
  }

  if (!appInitialized) {
    try {
      const app = new AppController(engine);
      appInitialized = true;
      console.log("App initialized successfully");
    } catch (err) {
      console.error("Error initializing app:", err);
      if (initAttempts < maxAttempts) {
        initAttempts++;
        setTimeout(initApp, 500);
      }
    }
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initApp);
} else {
  initApp();
}

window.addEventListener("load", initApp);
setTimeout(initApp, 2000);
