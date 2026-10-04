const COVERAGE = [
  { label: "Python", phaseIds: [1, 2] },
  { label: "SQL", phaseIds: [3] },
  { label: "Statistics", phaseIds: [4] },
  { label: "Machine Learning", phaseIds: [6, 7] },
  { label: "Data Visualization", phaseIds: [5] },
  { label: "Deployment", phaseIds: [9] },
];

function osIcon(name) {
  const paths = {
    trend: '<path d="M4 16.5 9 11l3.5 3.5L20 7"/><path d="M14.5 7H20v5.5"/>',
    phase: '<circle cx="12" cy="12" r="8"/><path d="M12 8v4l2.5 1.5"/>',
    focus: '<circle cx="12" cy="12" r="3"/><path d="M12 3.5v2.2M12 18.3v2.2M3.5 12h2.2M18.3 12h2.2"/>',
    gate: '<path d="M12 3.5 20 7.5v5.2c0 4.2-3.1 6.8-8 8.3-4.9-1.5-8-4.1-8-8.3V7.5L12 3.5z"/>',
    check: '<path d="M5 12.5 9.2 17 19 7"/>',
  };
  return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || ""}</svg>`;
}

function setTopicStatus(id, status) {
  state.topics[id] = status;
  if (!state.doneAt || typeof state.doneAt !== "object") state.doneAt = {};
  if (status === "done") {
    if (!state.doneAt[id]) state.doneAt[id] = new Date().toISOString();
  } else {
    delete state.doneAt[id];
  }
}

function localKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return y + "-" + m + "-" + d;
}

function weekActivity() {
  const now = new Date();
  const monday = new Date(now);
  monday.setHours(0, 0, 0, 0);
  const weekday = monday.getDay();
  monday.setDate(monday.getDate() - (weekday === 0 ? 6 : weekday - 1));
  const labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const dated = Object.entries(state.doneAt || {}).filter(([id, iso]) => statusOf(id) === "done" && iso);
  const tracking = dated.length > 0;
  const days = labels.map((label, i) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    const key = localKey(date);
    const names = dated.filter(([, iso]) => {
      const stamp = new Date(iso);
      return !Number.isNaN(stamp.getTime()) && localKey(stamp) === key;
    }).map(([id]) => (topicIndex.get(id) || {}).name).filter(Boolean);
    return { label, key, count: names.length, names, isToday: key === localKey(now) };
  });
  return { tracking, days, total: days.reduce((sum, day) => sum + day.count, 0) };
}

function splitItems(text) {
  return String(text || "").split(",").map((part) => part.replace(/\.$/, "").trim()).filter(Boolean);
}

function listHtml(items) {
  if (!items || !items.length) return "<p>None listed.</p>";
  return `<ul>${items.map((item) => `<li>${esc(item)}</li>`).join("")}</ul>`;
}

function actionableTopics(phase) {
  const ready = [];
  const blocked = [];
  walk(phase.topics, (node) => {
    if ((node.children || []).length) return;
    if (statusOf(node.id) === "done") return;
    if (prereqsMet(node)) ready.push(node);
    else blocked.push(node);
  });
  walk(phase.topics, (node) => {
    if (!(node.children || []).length || statusOf(node.id) === "done") return;
    const leaves = [];
    walk(node.children, (child) => {
      if (!(child.children || []).length) leaves.push(child);
    });
    if (leaves.length && leaves.every((child) => statusOf(child.id) === "done")) ready.push(node);
  });
  return ready.length ? ready : blocked;
}

function sessionMode(topics) {
  if (!topics.length) return "empty";
  const statuses = topics.map((topic) => statusOf(topic.id));
  if (statuses.every((status) => status === "done")) return "done";
  if (statuses.some((status) => status !== "todo")) return "active";
  return "idle";
}

function todayPlan(phase) {
  const untouched = overall().done === 0 && !Object.keys(state.topics || {}).length;
  const topic = firstStudy(phase);
  const session = actionableTopics(phase);
  if (untouched && DATA.days && DATA.days[0]) {
    const day = DATA.days[0];
    return {
      kicker: "Day 1 of " + DATA.days.length,
      title: day.topic,
      time: day.time,
      objective: phase.outcome || day.concepts,
      learn: splitItems(day.concepts),
      practice: day.practice,
      output: splitItems(day.output),
      exit: day.exit,
      session,
      topicId: session[0] && session[0].id,
    };
  }
  if (!topic && !session.length) return { empty: true, phase };
  const focus = topic || session[0];
  const learn = (focus.learn && focus.learn.length) ? focus.learn : (focus.what ? [focus.what] : []);
  const practice = (focus.practice && focus.practice.length)
    ? focus.practice.join(" ")
    : "Apply it on a fresh example, then explain it without notes.";
  return {
    kicker: phase.name,
    title: focus.name,
    time: focus.minutes ? focus.minutes + " min" : "",
    objective: focus.what || phase.outcome || "",
    learn,
    practice,
    output: focus.output ? splitItems(focus.output) : (focus.exit ? [focus.exit] : []),
    exit: focus.exit || "You can explain it aloud and use it on data you have not seen in a tutorial.",
    session: session.length ? session : [focus],
    topicId: focus.id,
  };
}

function gateReadiness(phase) {
  const gate = DATA.gates.find((item) => item.id === phase.id) || null;
  const stat = phaseNodesDone(phase);
  const passed = !!(gate && state.gates[gate.id]);
  let status = "locked";
  if (passed) status = "passed";
  else if (stat.total && stat.done === stat.total) status = "ready";
  return { gate, stat, passed, status };
}

function coverageStats() {
  return COVERAGE.map((group) => {
    const phases = group.phaseIds.map((id) => DATA.roadmap.find((phase) => phase.id === id)).filter(Boolean);
    let done = 0;
    let total = 0;
    phases.forEach((phase) => {
      const stat = phaseNodesDone(phase);
      done += stat.done;
      total += stat.total;
    });
    return {
      ...group,
      phases,
      done,
      total,
      pct: formatPct(done, total),
      width: total ? done / total * 100 : 0,
    };
  });
}

function nextBestAction() {
  const phase = currentPhase();
  const topic = firstStudy(phase);
  if (!topic) {
    const nxt = nextPhase(phase);
    if (nxt) {
      return {
        title: nxt.name,
        reason: "Every topic in " + phase.name + " is marked complete. " + nxt.name + " is the next phase on the roadmap.",
        phaseId: nxt.id,
      };
    }
    return {
      title: "Retest this phase",
      reason: "Every topic in " + phase.name + " is marked complete.",
      phaseId: phase.id,
    };
  }
  const unmet = prereqNames(topic).filter((node) => statusOf(node.id) !== "done");
  return {
    title: topic.name,
    reason: unmet.length
      ? "It stays blocked until you complete " + unmet.map((node) => node.name).join(", ") + "."
      : "It is the next topic in " + phase.name + " whose prerequisites are already complete.",
    topicId: topic.id,
  };
}

function parentNav(path) {
  if (window.parent && window.parent !== window) {
    window.parent.postMessage({ type: "ds-nav", path }, "*");
    return true;
  }
  return false;
}

function openPhase(id) {
  const roadmap = document.getElementById("roadmap");
  if (roadmap && roadmap.getClientRects().length) {
    state.expanded = state.expanded || {};
    state.expanded[id] = true;
    paint();
    scrollToPhase(id);
    return;
  }
  try { sessionStorage.setItem("ds-focus-phase", String(id)); } catch (err) { /* private mode */ }
  if (!parentNav("/skill-system")) scrollToPhase(id);
}

function phaseMark(phase, currentId) {
  const status = derivedPhase(phase);
  const current = phase.id === currentId;
  if (status === "done") return { cls: "is-done", text: "Complete" };
  if (current) return { cls: "is-current", text: status === "doing" ? "In progress" : "Current" };
  if (status === "doing") return { cls: "is-doing", text: "In progress" };
  return { cls: "", text: "Not started" };
}

function renderProgress() {
  const root = document.getElementById("os-dash");
  if (!root) return;
  const cur = currentPhase();
  const nxt = nextPhase(cur);
  const all = overall();
  const idx = DATA.roadmap.findIndex((phase) => phase.id === cur.id) + 1;
  const plan = todayPlan(cur);
  const week = weekActivity();
  const gate = gateReadiness(cur);
  const coverage = coverageStats();
  const action = nextBestAction();
  const navPct = document.getElementById("nav-progress");
  if (navPct) navPct.textContent = all.pct + "%";
  const radius = 52;
  const circ = 2 * Math.PI * radius;
  const offset = circ * (1 - all.width / 100);
  const focusName = plan.title || cur.short;
  const statusCopy = { locked: "Locked", ready: "Ready to attempt", passed: "Passed" };
  const milestoneDetail = gate.gate
    ? statusCopy[gate.status] + " · " + gate.stat.done + " / " + gate.stat.total + " phase topics"
    : "No gate on this phase";
  const phases = DATA.roadmap.map((phase) => {
    const mark = phaseMark(phase, cur.id);
    const num = String(phase.id + 1).padStart(2, "0");
    return `<button type="button" class="os-phase ${mark.cls}" data-phase-jump="${phase.id}" aria-current="${phase.id === cur.id ? "step" : "false"}">
      <span class="os-phase-track"><span class="os-phase-dot"></span><span class="os-phase-line"></span></span>
      <small>${num}</small>
      <strong>${esc(phase.short)}</strong>
      <em>${mark.text}</em>
    </button>`;
  }).join("");
  const skills = coverage.map((group) => `<button type="button" class="os-skill" data-cover="${group.phaseIds.join(",")}">
      <span class="os-skill-row"><strong>${esc(group.label)}</strong><span>${group.pct}% · ${group.done}/${group.total}</span></span>
      <span class="os-bar" role="progressbar" aria-valuenow="${group.pct}" aria-valuemin="0" aria-valuemax="100" aria-label="${esc(group.label)} coverage"><span style="width:${group.width}%"></span></span>
    </button>`).join("");
  const weekCells = week.days.map((day) => `<div class="os-week-day${day.isToday ? " is-today" : ""}">
      <span>${day.label}${day.isToday ? " · today" : ""}</span>
      <strong>${week.tracking ? day.count : "–"}</strong>
      <em>${week.tracking ? (day.count === 1 ? "topic" : "topics") : "no dates"}</em>
    </div>`).join("");
  const checks = gate.gate ? gate.gate.checks.map((check) => `<li><i aria-hidden="true">${gate.passed ? "✓" : "○"}</i><span>${esc(check)}${gate.passed ? " · Passed" : " · Not passed"}</span></li>`).join("") : "";
  const weekday = new Date().toLocaleDateString(undefined, { weekday: "long" });
  const focus = firstStudy(cur);

  root.innerHTML = `
    <div class="os-stack">
      <section class="os-hero" aria-labelledby="os-journey-title">
        <div class="os-ring" role="progressbar" aria-valuenow="${all.pct}" aria-valuemin="0" aria-valuemax="100" aria-label="Overall topic progress">
          <svg viewBox="0 0 120 120" aria-hidden="true">
            <circle class="os-ring-track" cx="60" cy="60" r="52"></circle>
            <circle class="os-ring-value" cx="60" cy="60" r="52" stroke-dasharray="${circ}" stroke-dashoffset="${offset}"></circle>
          </svg>
          <div class="os-ring-label"><strong>${all.pct}%</strong><span>complete</span></div>
        </div>
        <div>
          <p class="os-kicker">Your data science journey</p>
          <h3 id="os-journey-title">${all.done} / ${all.total} topics completed</h3>
          <div class="os-hero-stats">
            <div><span>Current phase</span><strong>${esc(cur.name)}</strong></div>
            <div><span>Position</span><strong>Phase ${idx} of ${DATA.roadmap.length}</strong></div>
            <div><span>Next phase</span><strong>${nxt ? esc(nxt.name) : "End of roadmap"}</strong></div>
          </div>
        </div>
      </section>
      <div class="os-kpi-grid">
        <div class="os-kpi">
          <span class="os-kpi-label">${osIcon("trend")} Overall progress</span>
          <strong>${all.pct}%</strong>
          <em>${all.done} / ${all.total} topics · ${week.tracking ? "+" + week.total + " this week" : "Start tracking"}</em>
        </div>
        <button type="button" class="os-kpi" data-phase-jump="${cur.id}">
          <span class="os-kpi-label">${osIcon("phase")} Current phase</span>
          <strong>${esc(cur.short)}</strong>
          <em>Phase ${idx} / ${DATA.roadmap.length}</em>
        </button>
        <button type="button" class="os-kpi" data-os="start">
          <span class="os-kpi-label">${osIcon("focus")} Current focus</span>
          <strong>${esc(focusName)}</strong>
          <em>${esc(cur.name)}</em>
        </button>
        <button type="button" class="os-kpi" data-os="open-gate" data-phase="${cur.id}">
          <span class="os-kpi-label">${osIcon("gate")} Next milestone</span>
          <strong>${gate.gate ? esc(gate.gate.name) + " Gate" : "Phase exit"}</strong>
          <em>${esc(milestoneDetail)}</em>
        </button>
      </div>
      <section class="os-panel" aria-labelledby="os-road-title">
        <div class="os-section-head">
          <div>
            <h3 id="os-road-title">Phase roadmap</h3>
            <p>Where you are, what is complete, and what is still ahead. Select a phase to open it.</p>
          </div>
        </div>
        <div class="os-road-scroll">
          <div class="os-road" role="list">${phases}</div>
        </div>
      </section>
      <div id="today-card" class="os-today"></div>
      <div class="os-split">
        <section class="os-panel" aria-labelledby="os-week-title">
          <div class="os-panel-head">
            <div>
              <h3 id="os-week-title">This week</h3>
              <p>${week.tracking ? week.total + " topics completed this week." : "Start tracking. Completion dates are saved when you mark a topic done."}</p>
            </div>
          </div>
          <div class="os-week" aria-label="Topics completed each day this week">${weekCells}</div>
          <p class="os-note">${esc(weekday)}${focus ? " — next topic: " + esc(focus.name) : ""}. No weekly target is set.</p>
        </section>
        <section class="os-panel" aria-labelledby="os-gate-title">
          <div class="os-panel-head">
            <div>
              <h3 id="os-gate-title">Gate readiness</h3>
              <p>${gate.gate ? esc(gate.gate.name) + " · " + esc(gate.gate.rule) : "This phase has no gate."}</p>
            </div>
            <span class="os-status ${gate.status}">${statusCopy[gate.status]}</span>
          </div>
          ${gate.gate ? `<p class="os-note">${gate.stat.done} / ${gate.stat.total} phase topics · ${gate.gate.checks.length} cold-start checks</p><ul class="os-reqs">${checks}</ul><div class="os-actions"><button type="button" class="os-btn os-btn-ghost" data-os="gate" data-gate="${gate.gate.id}">${gate.passed ? "Mark as not passed" : "Mark as passed"}</button></div>` : ""}
        </section>
      </div>
      <section class="os-panel" aria-labelledby="os-skill-title">
        <div class="os-section-head">
          <div>
            <h3 id="os-skill-title">Skill coverage</h3>
            <p>Share of topics marked complete in each roadmap area.</p>
          </div>
        </div>
        ${skills}
      </section>
      <section class="os-panel" aria-labelledby="os-days-title">
        <div id="day-list"></div>
      </section>
      <section class="os-next" aria-labelledby="os-next-title">
        <div>
          <p class="os-kicker">Next best action</p>
          <h3 id="os-next-title">${esc(action.title)}</h3>
          <p>${esc(action.reason)}</p>
        </div>
        <button type="button" class="os-btn os-btn-primary" data-os="next" ${action.topicId ? `data-topic="${esc(action.topicId)}"` : ""} ${action.phaseId != null ? `data-phase="${action.phaseId}"` : ""}>Continue</button>
      </section>
    </div>`;
  renderToday(cur);
  const lock = document.getElementById("lock-toggle");
  if (lock) lock.onchange = (event) => { state.lock = event.target.checked; paint(); };
}

function renderToday(phase) {
  const box = document.getElementById("today-card");
  if (!box) return;
  const phaseUse = phase || currentPhase();
  const plan = todayPlan(phaseUse);
  if (plan.empty) {
    const nxt = nextPhase(phaseUse);
    box.innerHTML = `
      <div class="os-today-head">
        <div>
          <p class="os-kicker">Today's study plan</p>
          <h3>${esc(phaseUse.name)} is complete</h3>
        </div>
      </div>
      <p class="os-note">Every topic in this phase is marked complete. Open the next phase, or retest its gate cold.</p>
      <div class="os-actions">
        ${nxt ? `<button type="button" class="os-btn os-btn-primary" data-phase-jump="${nxt.id}">Open ${esc(nxt.short)}</button>` : ""}
        <button type="button" class="os-btn os-btn-ghost" data-os="open-gate" data-phase="${phaseUse.id}">Review gate</button>
      </div>`;
    return;
  }
  const topics = plan.session || [];
  const doneCount = topics.filter((topic) => statusOf(topic.id) === "done").length;
  const mode = sessionMode(topics);
  const width = topics.length ? doneCount / topics.length * 100 : 0;
  const pct = topics.length ? Math.round(width) : 0;
  const tasks = topics.map((topic) => {
    const status = statusOf(topic.id);
    const unmet = prereqNames(topic).filter((node) => statusOf(node.id) !== "done");
    const meta = [label(status), topic.minutes ? topic.minutes + " min" : "", unmet.length ? "Complete " + unmet.map((node) => node.name).join(", ") + " first" : ""].filter(Boolean).join(" · ");
    return `<button type="button" class="os-task" data-task="${esc(topic.id)}" data-state="${esc(status)}" aria-pressed="${status === "done"}">
      <span class="os-check"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><path d="M5 12.5 9.2 17 19 7"/></svg></span>
      <span class="os-task-name">${esc(topic.name)}</span>
      <span class="os-task-meta">${esc(meta)}</span>
    </button>`;
  }).join("");
  const primary = mode === "done"
    ? `<span class="os-status passed">Session completed</span><button type="button" class="os-btn os-btn-ghost" data-os="review">Review session</button>`
    : mode === "active"
      ? `<button type="button" class="os-btn os-btn-primary" data-os="continue">Continue session</button>`
      : `<button type="button" class="os-btn os-btn-primary" data-os="start">Start today's session</button>`;
  box.innerHTML = `
    <div class="os-today-head">
      <div>
        <p class="os-kicker">Today's study plan</p>
        <h3>${esc(plan.title)}</h3>
        <p class="os-note">${esc(plan.kicker)}</p>
      </div>
      ${plan.time ? `<span class="os-pill">${esc(plan.time)} estimated</span>` : ""}
    </div>
    <div class="os-today-grid">
      <div>
        <div class="os-block"><h4>Today's objective</h4><p>${esc(plan.objective || "Work the next open topic.")}</p></div>
        <div class="os-block"><h4>Learn</h4>${listHtml(plan.learn)}</div>
        <div class="os-block"><h4>Practice</h4><p>${esc(plan.practice || "")}</p></div>
      </div>
      <div>
        <div class="os-block"><h4>Expected output</h4>${listHtml(plan.output)}</div>
        <div class="os-block"><h4>Exit condition</h4><p>${esc(plan.exit || "")}</p></div>
        <div class="os-actions">${primary}<button type="button" class="os-btn os-btn-ghost" data-os="plan">View full plan</button></div>
      </div>
    </div>
    <div class="os-session">
      <div class="os-bar-label"><span>Today's progress</span><span>${doneCount} / ${topics.length} topics</span></div>
      <div class="os-bar" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100" aria-label="Session topic progress"><span style="width:${width}%"></span></div>
      <div>${tasks}</div>
      <label class="os-lockrow">
        <input type="checkbox" id="lock-toggle" ${state.lock ? "checked" : ""}>
        <span>Prerequisite locking. Off by default. Unfinished prerequisites show “Complete X first”, and you can still open them. Turn locking on to hold a topic until those prerequisites are done.</span>
      </label>
    </div>`;
}

function renderDays() {
  const root = document.getElementById("day-list");
  if (!root || !DATA.days) return;
  const weeks = [];
  for (let i = 0; i < DATA.days.length; i += 7) weeks.push(DATA.days.slice(i, i + 7));
  const shown = state.daysOpen ? weeks : weeks.slice(0, 1);
  const currentDay = overall().done === 0 && !Object.keys(state.topics || {}).length ? 1 : null;
  root.innerHTML = `
    <div class="os-section-head">
      <div>
        <h3 id="os-days-title">First 30 days</h3>
        <p>Your foundation sprint. ${DATA.days.length} written sessions. Days are the plan, not a completion record — topics carry the checkmarks.</p>
      </div>
      <button type="button" class="os-btn os-btn-ghost" id="os-days-toggle" aria-expanded="${state.daysOpen ? "true" : "false"}">${state.daysOpen ? "Show this week" : "View 30-day roadmap"}</button>
    </div>
    ${shown.map((week, index) => `<div class="os-sprint-week"><h4>Week ${index + 1} · Days ${week[0].day}–${week[week.length - 1].day}</h4><ol class="os-sprint">${week.map((day) => `<li class="${day.day === currentDay ? "is-current" : ""}"><small>Day ${String(day.day).padStart(2, "0")}${day.day === currentDay ? " · current" : ""}</small><strong>${esc(day.topic)}</strong><em>${esc(day.time)}</em></li>`).join("")}</ol></div>`).join("")}
    ${state.daysOpen ? "" : `<p class="os-note">${Math.max(0, DATA.days.length - 7)} later sessions are in the full roadmap.</p>`}`;
}

function toggleTask(id) {
  const node = topicIndex.get(id);
  if (!node) return;
  if (state.lock && !prereqsMet(node) && prereqNames(node).length && statusOf(id) !== "done") {
    document.getElementById("live").textContent = "Complete prerequisites before marking " + node.name;
    return;
  }
  const next = statusOf(id) === "done" ? "todo" : "done";
  setTopicStatus(id, next);
  document.getElementById("live").textContent = node.name + " " + label(next);
  paint();
}

function runSession(kind) {
  const phase = currentPhase();
  const plan = todayPlan(phase);
  const topics = plan.session || [];
  const target = kind === "review" ? topics[0] : topics.find((topic) => statusOf(topic.id) !== "done");
  if (!target) {
    const nxt = nextPhase(phase);
    if (nxt) openPhase(nxt.id);
    return;
  }
  if (kind === "start" && statusOf(target.id) === "todo") {
    const blocked = state.lock && !prereqsMet(target) && prereqNames(target).length;
    if (!blocked) setTopicStatus(target.id, "doing");
  }
  openTopic(target.id);
}

function onProgressClick(event) {
  if (event.target.closest("#os-days-toggle")) {
    state.daysOpen = !state.daysOpen;
    renderDays();
    return;
  }
  const phaseBtn = event.target.closest("[data-phase-jump]");
  if (phaseBtn) {
    openPhase(Number(phaseBtn.dataset.phaseJump));
    return;
  }
  const coverBtn = event.target.closest("[data-cover]");
  if (coverBtn) {
    const ids = coverBtn.dataset.cover.split(",").map(Number);
    const phases = ids.map((id) => DATA.roadmap.find((phase) => phase.id === id)).filter(Boolean);
    const open = phases.find((phase) => derivedPhase(phase) !== "done") || phases[0];
    if (open) openPhase(open.id);
    return;
  }
  const taskBtn = event.target.closest("[data-task]");
  if (taskBtn) {
    toggleTask(taskBtn.dataset.task);
    return;
  }
  const act = event.target.closest("[data-os]");
  if (!act) return;
  const kind = act.dataset.os;
  if (kind === "start" || kind === "continue" || kind === "review") {
    runSession(kind);
    return;
  }
  if (kind === "plan") {
    if (!parentNav("/skill-system")) document.getElementById("roadmap").scrollIntoView({ behavior: motionOK ? "smooth" : "auto" });
    return;
  }
  if (kind === "gate") {
    const id = Number(act.dataset.gate);
    state.gates[id] = !state.gates[id];
    document.getElementById("live").textContent = "Gate " + id + (state.gates[id] ? " marked passed" : " marked not passed");
    paint();
    return;
  }
  if (kind === "open-gate") {
    if (!parentNav("/gates")) openPhase(Number(act.dataset.phase));
    return;
  }
  if (kind === "open-topic" && act.dataset.topic) {
    openTopic(act.dataset.topic);
    return;
  }
  if (kind === "next") {
    if (act.dataset.topic) openTopic(act.dataset.topic);
    else if (act.dataset.phase) openPhase(Number(act.dataset.phase));
    return;
  }
  if (kind === "home") {
    if (!parentNav("/")) window.scrollTo({ top: 0, behavior: motionOK ? "smooth" : "auto" });
    return;
  }
  if (kind === "help") {
    const panel = document.getElementById("os-help-panel");
    const willOpen = panel.hasAttribute("hidden");
    panel.toggleAttribute("hidden", !willOpen);
    panel.classList.toggle("open", willOpen);
    act.setAttribute("aria-expanded", willOpen ? "true" : "false");
  }
}

function renderOsSearch(query) {
  const box = document.getElementById("os-results");
  const input = document.getElementById("os-search");
  if (!box || !input) return;
  const hits = searchItems(query);
  osSearchActive = 0;
  if (!query.trim() || query.trim().length < 2) {
    box.classList.remove("open");
    box.innerHTML = "";
    input.setAttribute("aria-expanded", "false");
    return;
  }
  box.classList.add("open");
  input.setAttribute("aria-expanded", "true");
  box.innerHTML = hits.length
    ? hits.map((hit, i) => `<button type="button" class="os-result${i === 0 ? " active" : ""}" role="option" data-i="${i}"><strong>${esc(hit.title)}</strong><small>${esc(hit.kind)} · ${esc(hit.where)}</small></button>`).join("")
    : `<div class="os-result">No matches</div>`;
  box._hits = hits;
}

function activateOsHit(hit) {
  const box = document.getElementById("os-results");
  const input = document.getElementById("os-search");
  box.classList.remove("open");
  input.value = "";
  input.setAttribute("aria-expanded", "false");
  if (!hit) return;
  if (hit.topic) { openTopic(hit.topic); return; }
  if (hit.phase != null) { openPhase(hit.phase); return; }
  if (hit.project) {
    if (!parentNav("/projects")) activateHit(hit);
    return;
  }
  if (hit.skill && !parentNav("/skills")) activateHit(hit);
}

let osSearchActive = 0;
function bindProgressUi() {
  const panel = document.getElementById("progress-panel");
  if (panel && !panel.dataset.bound) {
    panel.dataset.bound = "true";
    panel.addEventListener("click", onProgressClick);
  }
  const input = document.getElementById("os-search");
  const box = document.getElementById("os-results");
  if (!input || input.dataset.bound) return;
  input.dataset.bound = "true";
  input.addEventListener("input", (event) => renderOsSearch(event.target.value));
  input.addEventListener("keydown", (event) => {
    const hits = box._hits || [];
    if (event.key === "Escape") { box.classList.remove("open"); return; }
    if (!hits.length) return;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      osSearchActive = event.key === "ArrowDown" ? Math.min(hits.length - 1, osSearchActive + 1) : Math.max(0, osSearchActive - 1);
      box.querySelectorAll(".os-result").forEach((el, i) => el.classList.toggle("active", i === osSearchActive));
    }
    if (event.key === "Enter") { event.preventDefault(); activateOsHit(hits[osSearchActive]); }
  });
  box.addEventListener("click", (event) => {
    const btn = event.target.closest(".os-result");
    if (!btn || btn.dataset.i == null) return;
    activateOsHit((box._hits || [])[Number(btn.dataset.i)]);
  });
  document.addEventListener("click", (event) => {
    if (!event.target.closest(".os-search")) box.classList.remove("open");
  });
}
