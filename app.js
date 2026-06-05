// ==============================
// ETIJAH175 - App Controller
// ==============================

class AppController {
  constructor(engine) {
    this.engine = engine;
    this.currentMode = "all"; // all, missions, actions
    this.init();
  }

  init() {
    this.bindEvents();
    this.updateStats();
    this.updateTimeDisplay();
    setInterval(() => this.updateTimeDisplay(), 60000);
  }

  bindEvents() {
    // Primary action
    const generateBtn = document.getElementById("generateBtn");
    if (generateBtn) {
      generateBtn.addEventListener("click", () => this.handleGenerate());
    }

    // Confirmation buttons
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

  handleGenerate() {
    // Filter based on current mode
    const item = this.engine.generate();

    if (item) {
      this.renderItem(item);
      this.showConfirmationButtons();
      this.updateStats();
    }
  }

  renderItem(item) {
    const output = document.getElementById("output");
    if (!output) return;

    const itemType = item.type === "mission" ? "مهمة" : "إجراء";
    const duration = item.duration ? `${item.duration} دقيقة` : "-";
    const intensity = item.intensity ? this.translateIntensity(item.intensity) : "-";

    let html = `
      <h2>${item.title || item.action}</h2>
      <p><b>النوع:</b> ${itemType}</p>
      <p><b>الهدف:</b> ${item.goal || "-"}</p>
      <p><b>الحالة:</b> ${this.translateState(this.engine.state)}</p>
      <p><b>الشدة:</b> ${intensity}</p>
    `;

    if (item.duration) {
      html += `<p><b>المدة:</b> ${duration}</p>`;
    }

    html += `<p><b>شرط النجاح:</b> ${item.success_condition || "-"}</p>`;

    if (item.guidance) {
      html += `<p><b>التوجيه:</b> ${item.guidance}</p>`;
    }

    output.innerHTML = html;
    output.classList.add("active");
    this.updateStateDisplay();
  }

  showConfirmationButtons() {
    const confirmSection = document.getElementById("confirmSection");
    if (confirmSection) {
      confirmSection.style.display = "flex";
    }
  }

  hideConfirmationButtons() {
    const confirmSection = document.getElementById("confirmSection");
    if (confirmSection) {
      confirmSection.style.display = "none";
    }
  }

  handleConfirm(status) {
    this.engine.confirm(status);

    let message = "";
    if (status === "DONE") {
      message = "ممتاز! تم تحديث الشريط.";
    } else if (status === "SKIP") {
      message = "تم تسجيل التخطي. سيتم تعديل الصعوبة.";
    } else if (status === "FAILED") {
      message = "تم تسجيل الفشل. سيتم تقليل الشدة.";
    }

    alert(message);
    this.hideConfirmationButtons();
    this.updateStats();
  }

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

    alert(`تم التبديل إلى وضع: ${mode === "missions" ? "المهام فقط" : "الإجراءات فقط"}`);
  }

  activateEmergencyMode() {
    const antiAddictionActions = this.engine.actions.actions
      ? this.engine.actions.actions.filter(a => a.category === "anti_addiction")
      : this.engine.actions.filter(a => a.category === "anti_addiction");

    if (antiAddictionActions.length === 0) {
      alert("لا توجد إجراءات مضادة للإدمان متاحة.");
      return;
    }

    const chosen = antiAddictionActions[Math.floor(Math.random() * antiAddictionActions.length)];
    this.renderItem({ ...chosen, type: "action" });
    this.showConfirmationButtons();

    // Update state badge
    const stateBadge = document.getElementById("stateDisplay");
    if (stateBadge) {
      stateBadge.textContent = "وضع الطوارئ";
      stateBadge.className = "state-badge urge";
    }
  }

  updateStats() {
    const historyCount = document.getElementById("historyCount");
    const streakCount = document.getElementById("streakCount");

    if (historyCount) {
      historyCount.textContent = this.engine.history.length;
    }

    if (streakCount) {
      // Calculate current streak (consecutive DONE items)
      let streak = 0;
      for (let i = this.engine.history.length - 1; i >= 0; i--) {
        if (this.engine.history[i].status === "DONE") {
          streak++;
        } else {
          break;
        }
      }
      streakCount.textContent = streak;
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

    const state = this.engine.state;
    const stateText = this.translateState(state);
    const stateClass = state.toLowerCase();

    stateBadge.textContent = stateText;
    stateBadge.className = `state-badge ${stateClass}`;
  }

  handleGenerate() {
    // Filter based on current mode
    const item = this.engine.generate();

    if (item) {
      this.renderItem(item);
      this.showConfirmationButtons();
      this.updateStats();
    }
  }

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

// Wait for engine to be ready
let appInitialized = false;

function initApp() {
  if (typeof engine !== "undefined" && engine.actions.length > 0 && !appInitialized) {
    const app = new AppController(engine);
    appInitialized = true;
    console.log("App initialized successfully");
  } else if (!appInitialized) {
    setTimeout(initApp, 500);
  }
}

// Start initialization
document.addEventListener("DOMContentLoaded", initApp);
window.addEventListener("load", initApp);

// Fallback initialization
setTimeout(initApp, 1000);
