// ==============================
// Focus-first Behavioral Engine V2
// ==============================

class FocusEngine {
  constructor() {
    this.actions = [];
    this.missions = [];

    this.history = JSON.parse(localStorage.getItem("history") || "[]");
    this.lastDecision = null;

    this.state = "IDLE";

    this.init();
  }

  // ==============================
  // INIT
  // ==============================
  async init() {
    try {
      const [actionsRes, missionsRes] = await Promise.all([
        fetch("actions.json"),
        fetch("missions.json")
      ]);

      this.actions = await actionsRes.json();
      this.missions = await missionsRes.json();

      this.bindUI();
      this.startActivityTracker();

      console.log("Engine Ready");
    } catch (err) {
      console.error("Failed to load data", err);
    }
  }

  // ==============================
  // UI BINDING
  // ==============================
  bindUI() {
    const btn = document.getElementById("generateBtn");
    const doneBtn = document.getElementById("doneBtn");
    const skipBtn = document.getElementById("skipBtn");

    if (btn) btn.onclick = () => this.generate();
    if (doneBtn) doneBtn.onclick = () => this.confirm("DONE");
    if (skipBtn) skipBtn.onclick = () => this.confirm("SKIP");
  }

  // ==============================
  // CONTEXT DETECTION
  // ==============================
  getTimeContext() {
    const h = new Date().getHours();

    if (h >= 5 && h < 12) return "morning";
    if (h >= 12 && h < 17) return "afternoon";
    if (h >= 17 && h < 22) return "evening";
    return "night";
  }

  detectState() {
    const last = this.history.slice(-5);

    const recentActions = last.filter(x => x.type === "action").length;

    const time = this.getTimeContext();

    if (time === "night" && recentActions > 3) return "URGE";
    if (recentActions >= 3) return "DISTRACTED";
    if (last.length === 0) return "IDLE";

    return "FOCUSED";
  }

  // ==============================
  // SCORING SYSTEM
  // ==============================
  scoreItem(item) {
    let score = 100;

    const last10 = this.history.slice(-10);

    // repetition penalty
    const repeatCount = last10.filter(x => x.id === item.id).length;
    score -= repeatCount * 30;

    // category repetition penalty
    const lastCategory = last10.slice(-3).map(x => x.category);
    if (lastCategory.filter(c => c === item.category).length >= 2) {
      score -= 40;
    }

    // cooldown
    const lastUse = this.history
      .filter(h => h.id === item.id)
      .slice(-1)[0];

    if (lastUse) {
      const hours = (Date.now() - lastUse.time) / 3600000;
      if (hours < 72) score -= 50;
    }

    // state matching
    const state = this.state;

    if (state === "URGE" && item.category === "anti_addiction") score += 80;
    if (state === "FOCUSED" && item.type === "mission") score += 50;
    if (state === "DISTRACTED" && item.type === "action") score += 60;

    return score;
  }

  // ==============================
  // POOL BUILDER
  // ==============================
  buildPool() {
    const actions = this.actions.missions ? [] : this.actions;
    const missions = this.missions.missions || this.missions;

    return [
      ...actions.map(a => ({ ...a, type: "action" })),
      ...missions.map(m => ({ ...m, type: "mission" }))
    ];
  }

  // ==============================
  // DECISION ENGINE
  // ==============================
  generate() {
    this.state = this.detectState();

    const pool = this.buildPool();

    const scored = pool
      .map(item => ({
        item,
        score: this.scoreItem(item)
      }))
      .sort((a, b) => b.score - a.score);

    const top = scored.slice(0, 5);
    const chosen = top[Math.floor(Math.random() * top.length)].item;

    this.lastDecision = chosen;

    this.render(chosen);

    return chosen;
  }

  // ==============================
  // UI RENDER
  // ==============================
  render(item) {
    const box = document.getElementById("output");

    if (!box) return;

    box.innerHTML = `
      <h2>${item.title}</h2>
      <p><b>Goal:</b> ${item.goal || "-"}</p>
      <p><b>Type:</b> ${item.type}</p>
      <p><b>State:</b> ${this.state}</p>
      <p><b>Success:</b> ${item.success_condition || "-"}</p>
    `;
  }

  // ==============================
  // CONFIRMATION SYSTEM
  // ==============================
  confirm(status) {
    if (!this.lastDecision) return;

    this.history.push({
      id: this.lastDecision.id,
      type: this.lastDecision.type,
      category: this.lastDecision.category,
      time: Date.now(),
      status
    });

    localStorage.setItem("history", JSON.stringify(this.history));

    if (status === "DONE") {
      alert("Great. Streak updated.");
    } else {
      alert("Noted. Adjusting difficulty.");
    }
  }

  // ==============================
  // ACTIVITY TRACKER
  // ==============================
  startActivityTracker() {
    let lastActivity = Date.now();

    const update = () => (lastActivity = Date.now());

    window.addEventListener("mousemove", update);
    window.addEventListener("keydown", update);

    setInterval(() => {
      const idle = Date.now() - lastActivity;

      if (idle > 60000) {
        this.state = "IDLE";
      }
    }, 5000);
  }

  // ==============================
  // RESET
  // ==============================
  reset() {
    localStorage.removeItem("history");
    this.history = [];
  }
}

// ==============================
// START ENGINE
// ==============================
const engine = new FocusEngine();