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
    if (actionsBtn) {
      actionsBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        const dropdown = document.getElementById("actionsDropdown");
        if (dropdown) {
          dropdown.style.display = dropdown.style.display === "none" ? "flex" : "none";
        }
      });
    }

    // Category buttons
    const categoryButtons = document.querySelectorAll('.btn-category');
    categoryButtons.forEach(btn => {
      btn.addEventListener("click", (e) => {
        const category = e.target.getAttribute('data-category');
        this.setMode(category);
        // Close dropdown after selection
        const dropdown = document.getElementById("actionsDropdown");
        if (dropdown) {
          dropdown.style.display = "none";
        }
      });
    });
    
    // Close dropdowns when clicking outside
    document.addEventListener("click", (e) => {
      const actionsDropdown = document.getElementById("actionsDropdown");
      const actionsBtn = document.getElementById("actionsBtn");
      const missionsDropdown = document.getElementById("missionsDropdown");
      const missionsBtn = document.getElementById("missionsBtn");
      
      if (actionsDropdown && actionsBtn && !actionsBtn.contains(e.target) && !actionsDropdown.contains(e.target)) {
        actionsDropdown.style.display = "none";
      }
      
      if (missionsDropdown && missionsBtn && !missionsBtn.contains(e.target) && !missionsDropdown.contains(e.target)) {
        missionsDropdown.style.display = "none";
      }
    });

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
    // Generate the decision - always from all if no specific mode selected
    const mode = this.currentMode === "all" ? "all" : this.currentMode;
    const item = this.engine.generate(mode);

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
  showCategoryMenu() {
    const categories = [
      { name: 'مضاد إدمان', value: 'anti_addiction' },
      { name: 'إنتاجية', value: 'productivity' },
      { name: 'إعادة تعيين', value: 'reset' },
      { name: 'حركة', value: 'movement' },
      { name: 'لياقة', value: 'fitness' },
      { name: 'عقل', value: 'mind' },
      { name: 'روحي', value: 'spiritual' },
      { name: 'الكل', value: 'all' }
    ];

    const menuHtml = `
      <div class="category-menu">
        ${categories.map(cat => `
          <button class="category-option" data-category="${cat.value}">
            ${cat.name}
          </button>
        `).join('')}
      </div>
    `;

    const output = document.getElementById("output");
    const existingMenu = output.querySelector('.category-menu');
    if (existingMenu) {
      existingMenu.remove();
    } else {
      const menu = document.createElement('div');
      menu.innerHTML = menuHtml;
      output.appendChild(menu);

      // Add event listeners
      menu.querySelectorAll('.category-option').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const category = e.target.getAttribute('data-category');
          this.setMode(category);
          menu.remove();
        });
      });
    }
  }

  renderItem(item) {
    const output = document.getElementById("output");
    if (!output) return;

    let html = `
      <div class="output-content">
        <div class="item-header">
          <h2>${item.title || item.action}</h2>
        </div>
        
        <div class="output-meta">
          <p><b>الهدف:</b> ${item.goal || "-"}</p>
        </div>
        
        <p class="success-condition"><b>شرط النجاح:</b> ${item.success_condition || "-"}</p>
    `;

    if (item.guidance) {
      html += `<p class="guidance"><b>التوجيه:</b> ${item.guidance}</p>`;
    }

    html += `
      <div class="timer-container">
        <div class="timer-label">الوقت المتبقي:</div>
        <div id="timer" class="timer">00:00</div>
      </div>
    </div>`;

    output.innerHTML = html;
    output.classList.add("active");
    
    // Show progress container (but don't start timer yet)
    const progressContainer = document.getElementById("progressContainer");
    if (progressContainer) {
      progressContainer.style.display = "block";
      const progressBar = document.getElementById("progressBar");
      if (progressBar) {
        progressBar.style.width = "0%";
      }
    }
    
    // Store current item for later use
    this.currentItem = item;
    this.timerRunning = false;
  }

  stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  startTimer(minutes) {
    let totalSeconds = minutes * 60;
    const initialSeconds = totalSeconds;
    const timerElement = document.getElementById("timer");
    const progressBar = document.getElementById("progressBar");
    
    if (!timerElement) return;

    // Disable all buttons during timer
    this.disableAllButtons(true);

    this.timerInterval = setInterval(() => {
      const mins = Math.floor(totalSeconds / 60);
      const secs = totalSeconds % 60;
      timerElement.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
      
      // Update progress bar
      if (progressBar) {
        const progress = ((initialSeconds - totalSeconds) / initialSeconds) * 100;
        progressBar.style.width = progress + '%';
      }
      
      if (totalSeconds <= 0) {
        timerElement.classList.add("timer-done");
        // Enable buttons when timer finishes
        this.disableAllButtons(false);
        this.timerRunning = false;
        this.stopTimer();
        
        // Log as DONE
        this.engine.log(this.currentItem, "DONE");
        this.updateStats();
        
        // Clear output
        const output = document.getElementById("output");
        if (output) output.innerHTML = '<div class="output-placeholder"><p>اضغط "يلا بينا" لبدء</p></div>';
        
        // Generate next
        setTimeout(() => this.handleGenerate(), 500);
        return;
      }
      
      if (totalSeconds <= 60) {
        timerElement.classList.add("timer-warning");
      }
      
      totalSeconds--;
    }, 1000);
  }

  disableAllButtons(disabled) {
    const buttons = document.querySelectorAll('.btn');
    buttons.forEach(btn => {
      // Don't disable confirmation buttons (تم, تخطي, فشل)
      if (btn.classList.contains('btn-confirm')) {
        btn.disabled = false;
        btn.classList.remove('btn-disabled');
      } else {
        btn.disabled = disabled;
        if (disabled) {
          btn.classList.add('btn-disabled');
        } else {
          btn.classList.remove('btn-disabled');
        }
      }
    });
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

    // Generate new item with the selected mode
    this.handleGenerate();
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
