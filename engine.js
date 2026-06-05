// ==============================
// Focus-first Behavioral Engine V2
// Core: Decision → Execution (No Negotiation)
// ==============================

class FocusEngine {
  constructor() {
    this.actions = [];
    this.missions = [];

    this.history = JSON.parse(localStorage.getItem("history") || "[]");
    this.lastDecision = null;
    this.currentState = "IDLE";
    this.lastActivityTime = Date.now();

    this.init();
  }

  // ==============================
  // INITIALIZATION
  // ==============================
  async init() {
    try {
      const [actionsRes, missionsRes] = await Promise.all([
        fetch("Actions.json"),
        fetch("Missions.json")
      ]);

      if (!actionsRes.ok || !missionsRes.ok) {
        throw new Error(`HTTP error! actions: ${actionsRes.status}, missions: ${missionsRes.status}`);
      }

      const actionsData = await actionsRes.json();
      const missionsData = await missionsRes.json();

      this.actions = actionsData.actions || actionsData || [];
      this.missions = missionsData.missions || missionsData || [];

      console.log(`✓ Loaded ${this.actions.length} actions and ${this.missions.length} missions`);

      this.bindUI();
      this.startActivityTracker();

      console.log("✓ Engine Ready");
    } catch (err) {
      console.error("✗ Failed to load data", err);
      // Fallback: use empty arrays
      this.actions = [];
      this.missions = [];
    }
  }

  // ==============================
  // UI BINDING
  // ==============================
  bindUI() {
    const btn = document.getElementById("generateBtn");
    const doneBtn = document.getElementById("doneBtn");
    const skipBtn = document.getElementById("skipBtn");
    const failBtn = document.getElementById("failBtn");

    if (btn) btn.onclick = () => this.generate();
    if (doneBtn) doneBtn.onclick = () => this.confirm("DONE");
    if (skipBtn) skipBtn.onclick = () => this.confirm("SKIP");
    if (failBtn) failBtn.onclick = () => this.confirm("FAILED");
  }

  // ==============================
  // BEHAVIORAL STATE DETECTION
  // ==============================
  detectState() {
    const now = Date.now();
    const idleThreshold = 5 * 60 * 1000; // 5 minutes
    const timeSinceLastActivity = now - this.lastActivityTime;

    // Check idle state
    if (timeSinceLastActivity > idleThreshold) {
      return "IDLE";
    }

    // Check recent history for patterns
    const last5 = this.history.slice(-5);
    const recentActions = last5.filter(x => x.type === "action").length;
    const recentSkips = last5.filter(x => x.status === "SKIP").length;

    // Check time of day
    const hour = new Date().getHours();
    const isLateNight = hour >= 22 || hour < 5;

    // Detect addiction risk
    if (isLateNight && recentActions >= 3 && recentSkips >= 2) {
      return "URGE"; // Critical intervention needed
    }

    if (recentSkips >= 2) {
      return "DISTRACTED"; // User is avoiding tasks
    }

    if (recentActions >= 3) {
      return "DISTRACTED"; // Too many quick actions
    }

    // Default to focused
    return "FOCUSED";
  }

  // ==============================
  // SCORING SYSTEM (DYNAMIC)
  // ==============================
  scoreItem(item, state) {
    let score = 100;

    // 1. STATE MATCHING (Critical)
    if (state === "URGE" && item.category === "anti_addiction") {
      score += 200; // Force anti-addiction action
    } else if (state === "DISTRACTED" && item.category === "anti_addiction") {
      score += 150;
    } else if (state === "IDLE" && item.intensity === "low") {
      score += 80; // Light actions for idle state
    } else if (state === "FOCUSED" && item.type === "mission") {
      score += 100; // Deep work for focused state
    }

    // 2. REPETITION PENALTY (Last 10 items)
    const last10 = this.history.slice(-10);
    const repeatCount = last10.filter(x => x.id === item.id).length;
    score -= repeatCount * 40;

    // 3. CATEGORY REPETITION PENALTY
    const lastCategories = last10.slice(-3).map(x => x.category);
    const categoryCount = lastCategories.filter(c => c === item.category).length;
    if (categoryCount >= 2) {
      score -= 60;
    }

    // 4. COOLDOWN PENALTY
    const lastUse = this.history
      .filter(h => h.id === item.id)
      .slice(-1)[0];

    if (lastUse) {
      const hoursSinceUse = (Date.now() - lastUse.time) / 3600000;
      const cooldown = item.cooldown || 24;

      if (hoursSinceUse < cooldown) {
        score -= Math.max(100, cooldown * 10);
      }
    }

    // 5. SUCCESS HISTORY WEIGHT
    const successCount = this.history.filter(
      x => x.id === item.id && x.status === "DONE"
    ).length;
    const failCount = this.history.filter(
      x => x.id === item.id && x.status === "FAILED"
    ).length;

    score += successCount * 10;
    score -= failCount * 20;

    // 6. TIME COMPATIBILITY
    const timeContext = this.getTimeContext();
    if (item.time && item.time.includes(timeContext)) {
      score += 30;
    }

    // 7. INTENSITY MATCH
    if (state === "URGE" && item.intensity === "high") {
      score += 50;
    } else if (state === "IDLE" && item.intensity === "low") {
      score += 40;
    }

    return Math.max(0, score);
  }

  // ==============================
  // TIME CONTEXT
  // ==============================
  getTimeContext() {
    const h = new Date().getHours();
    if (h >= 5 && h < 12) return "morning";
    if (h >= 12 && h < 17) return "afternoon";
    if (h >= 17 && h < 22) return "evening";
    return "night";
  }

  // ==============================
  // BUILD POOL
  // ==============================
  buildPool() {
    const actions = Array.isArray(this.actions) ? this.actions : [];
    const missions = Array.isArray(this.missions) ? this.missions : [];

    return [
      ...actions.map(a => ({ ...a, type: "action" })),
      ...missions.map(m => ({ ...m, type: "mission" }))
    ];
  }

  // ==============================
  // DECISION ENGINE (CORE)
  // ==============================
  generate() {
    // Detect current state
    this.currentState = this.detectState();

    // Build pool
    const pool = this.buildPool();

    if (pool.length === 0) {
      console.error("No items in pool");
      return null;
    }

    // Score all items
    const scored = pool
      .map(item => ({
        item,
        score: this.scoreItem(item, this.currentState)
      }))
      .sort((a, b) => b.score - a.score);

    // Get top candidates (best scored items)
    const topCandidates = scored.slice(0, Math.min(5, scored.length));

    // Hard rule: never repeat same ID consecutively
    const lastItem = this.history.slice(-1)[0];
    let filteredCandidates = topCandidates.filter(c => !lastItem || c.item.id !== lastItem.id);

    // If all top candidates are the same ID, use all
    if (filteredCandidates.length === 0) {
      filteredCandidates = topCandidates;
    }

    // Hard rule: avoid same category twice in a row
    if (lastItem) {
      const differentCategory = filteredCandidates.filter(
        c => c.item.category !== lastItem.category
      );
      if (differentCategory.length > 0) {
        filteredCandidates = differentCategory;
      }
    }

    // Random selection from filtered candidates (weighted randomization)
    const chosen = filteredCandidates[Math.floor(Math.random() * filteredCandidates.length)].item;

    this.lastDecision = chosen;
    console.log(`Selected: ${chosen.title || chosen.action} (ID: ${chosen.id})`);
    return chosen;
  }

  // ==============================
  // CONFIRMATION SYSTEM
  // ============================== 
  confirm(status) {
    if (!this.lastDecision) return;

    this.history.push({
      id: this.lastDecision.id,
      title: this.lastDecision.title || this.lastDecision.action,
      type: this.lastDecision.type,
      category: this.lastDecision.category,
      time: Date.now(),
      status: status
    });

    localStorage.setItem("history", JSON.stringify(this.history));

    // Update activity time
    this.lastActivityTime = Date.now();

    return {
      status: status,
      message: this.getConfirmationMessage(status)
    };
  }

  getConfirmationMessage(status) {
    const messages = {
      "DONE": "ممتاز! تم تحديث الشريط. 💪",
      "SKIP": "تم تسجيل التخطي. سيتم تعديل الاختيار. ⏭️",
      "FAILED": "تم تسجيل الفشل. سيتم تقليل الشدة. 📉"
    };
    return messages[status] || "تم التسجيل.";
  }

  // ==============================
  // ACTIVITY TRACKER
  // ==============================
  startActivityTracker() {
    const update = () => {
      this.lastActivityTime = Date.now();
    };

    window.addEventListener("mousemove", update);
    window.addEventListener("keydown", update);
    window.addEventListener("click", update);
    window.addEventListener("touchstart", update);
  }

  // ==============================
  // STATISTICS
  // ==============================
  getStats() {
    const total = this.history.length;
    const done = this.history.filter(x => x.status === "DONE").length;
    const skipped = this.history.filter(x => x.status === "SKIP").length;
    const failed = this.history.filter(x => x.status === "FAILED").length;

    // Calculate streak
    let streak = 0;
    for (let i = this.history.length - 1; i >= 0; i--) {
      if (this.history[i].status === "DONE") {
        streak++;
      } else {
        break;
      }
    }

    return {
      total,
      done,
      skipped,
      failed,
      streak,
      successRate: total > 0 ? Math.round((done / total) * 100) : 0
    };
  }

  // ==============================
  // RESET
  // ==============================
  reset() {
    localStorage.removeItem("history");
    this.history = [];
    this.lastDecision = null;
  }

  // ==============================
  // EXPORT DATA
  // ==============================
  exportHistory() {
    return JSON.stringify(this.history, null, 2);
  }
}

// ==============================
// START ENGINE
// ==============================
const engine = new FocusEngine();
