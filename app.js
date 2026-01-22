const STORAGE_KEY = "cat-hotel-data";
const defaultState = {
  owners: [],
  cats: [],
  stays: [],
  visits: [],
  careMarks: [],
};

let state = loadState();
let editing = {
  ownerId: null,
  catId: null,
  stayId: null,
  visitId: null,
  careId: null,
};
let calendarDate = new Date();

const elements = {
  ownerForm: document.getElementById("ownerForm"),
  ownerName: document.getElementById("ownerName"),
  ownerContact: document.getElementById("ownerContact"),
  ownerDiscount: document.getElementById("ownerDiscount"),
  ownerNote: document.getElementById("ownerNote"),
  catForm: document.getElementById("catForm"),
  catName: document.getElementById("catName"),
  catOwner: document.getElementById("catOwner"),
  catNote: document.getElementById("catNote"),
  ownerTable: document.getElementById("ownerTable").querySelector("tbody"),
  catTable: document.getElementById("catTable").querySelector("tbody"),
  stayForm: document.getElementById("stayForm"),
  stayCat: document.getElementById("stayCat"),
  stayType: document.getElementById("stayType"),
  stayStart: document.getElementById("stayStart"),
  stayEnd: document.getElementById("stayEnd"),
  stayUnitPrice: document.getElementById("stayUnitPrice"),
  stayDays: document.getElementById("stayDays"),
  stayFee: document.getElementById("stayFee"),
  stayCareDate: document.getElementById("stayCareDate"),
  stayCareType: document.getElementById("stayCareType"),
  stayCareNote: document.getElementById("stayCareNote"),
  stayTable: document.getElementById("stayTable").querySelector("tbody"),
  visitForm: document.getElementById("visitForm"),
  visitOwner: document.getElementById("visitOwner"),
  visitStart: document.getElementById("visitStart"),
  visitEnd: document.getElementById("visitEnd"),
  visitFrequency: document.getElementById("visitFrequency"),
  visitUnitPrice: document.getElementById("visitUnitPrice"),
  visitCount: document.getElementById("visitCount"),
  visitCustom: document.getElementById("visitCustom"),
  visitFee: document.getElementById("visitFee"),
  visitTable: document.getElementById("visitTable").querySelector("tbody"),
  careForm: document.getElementById("careForm"),
  careCat: document.getElementById("careCat"),
  careDate: document.getElementById("careDate"),
  careType: document.getElementById("careType"),
  careNote: document.getElementById("careNote"),
  careTable: document.getElementById("careTable").querySelector("tbody"),
  calendar: document.getElementById("calendar"),
  calendarTitle: document.getElementById("calendarTitle"),
  prevMonth: document.getElementById("prevMonth"),
  nextMonth: document.getElementById("nextMonth"),
  monthlyRevenue: document.getElementById("monthlyRevenue"),
  monthlyCats: document.getElementById("monthlyCats"),
  monthlyVisits: document.getElementById("monthlyVisits"),
};

const careTypeOptions = {
  attention: { label: "重点关注", icon: "⭐" },
  medical: { label: "医疗照顾", icon: "🏥" },
  medicine: { label: "喂药", icon: "💊" },
  grooming: { label: "清洁护理", icon: "🧴" },
};

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return structuredClone(defaultState);
  }
  try {
    const parsed = JSON.parse(raw);
    return {
      ...structuredClone(defaultState),
      ...parsed,
    };
  } catch (error) {
    console.warn("读取本地数据失败，已重置。", error);
    return structuredClone(defaultState);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function formatCurrency(value) {
  const number = Number(value) || 0;
  return `A$${number.toLocaleString("zh-CN")}`;
}

function daysBetween(start, end) {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const diff = endDate.getTime() - startDate.getTime();
  return Math.max(Math.floor(diff / (1000 * 60 * 60 * 24)) + 1, 1);
}

function toDateKey(date) {
  return new Date(date).toISOString().split("T")[0];
}

function parseCustomDates(input) {
  if (!input) {
    return [];
  }
  const dates = input
    .split(/,|，/)
    .map((value) => value.trim())
    .filter(Boolean);
  return [...new Set(dates)];
}

function getVisitDates(visit) {
  const start = new Date(visit.start);
  const end = new Date(visit.end);
  if (visit.frequency === "custom") {
    return parseCustomDates(visit.customDates).map(toDateKey);
  }
  const dates = [];
  const step = visit.frequency === "alternate" ? 2 : 1;
  for (let current = new Date(start); current <= end; current.setDate(current.getDate() + step)) {
    dates.push(toDateKey(current));
  }
  return dates;
}

function getVisitCount(visit) {
  if (!visit.start || !visit.end) {
    return 0;
  }
  return getVisitDates(visit).length;
}

function getCareTypeLabel(type) {
  return careTypeOptions[type]?.label || "特殊照顾";
}

function getCareTypeIcon(type) {
  return careTypeOptions[type]?.icon || "⭐";
}

function updateDashboard() {
  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();
  const staysThisMonth = state.stays.filter((stay) => {
    const date = new Date(stay.start);
    return date.getMonth() === month && date.getFullYear() === year;
  });
  const visitsThisMonth = state.visits.filter((visit) => {
    const date = new Date(visit.start);
    return date.getMonth() === month && date.getFullYear() === year;
  });
  const revenue = [...staysThisMonth, ...visitsThisMonth].reduce(
    (sum, item) => sum + Number(item.fee || 0),
    0
  );

  elements.monthlyRevenue.textContent = formatCurrency(revenue);
  elements.monthlyCats.textContent = staysThisMonth.length.toString();
  elements.monthlyVisits.textContent = visitsThisMonth.length.toString();
}

function renderOwnerOptions() {
  const options = state.owners
    .map((owner) => `<option value="${owner.id}">${owner.name}</option>`)
    .join("");
  elements.catOwner.innerHTML = options || '<option value="">请先添加客人</option>';
  elements.visitOwner.innerHTML = options || '<option value="">请先添加客人</option>';
}

function renderCatOptions() {
  const options = state.cats
    .map((cat) => `<option value="${cat.id}">${cat.name}</option>`)
    .join("");
  elements.stayCat.innerHTML = options || '<option value="">请先添加猫咪</option>';
  elements.careCat.innerHTML = options || '<option value="">请先添加猫咪</option>';
}

function renderOwners() {
  elements.ownerTable.innerHTML = "";
  state.owners.forEach((owner) => {
    const discountLabel =
      owner.discountPercent && Number(owner.discountPercent) > 0
        ? `${owner.discountPercent}%`
        : "—";
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${owner.name}</td>
      <td>${owner.contact || ""}</td>
      <td>${discountLabel}</td>
      <td>${owner.note || ""}</td>
      <td>
        <button data-action="edit" data-id="${owner.id}">编辑</button>
        <button data-action="delete" data-id="${owner.id}">删除</button>
      </td>
    `;
    elements.ownerTable.appendChild(row);
  });
}

function renderCats() {
  elements.catTable.innerHTML = "";
  state.cats.forEach((cat) => {
    const owner = state.owners.find((item) => item.id === cat.ownerId);
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${cat.name}</td>
      <td>${owner ? owner.name : ""}</td>
      <td>${cat.note || ""}</td>
      <td>
        <button data-action="edit" data-id="${cat.id}">编辑</button>
        <button data-action="delete" data-id="${cat.id}">删除</button>
      </td>
    `;
    elements.catTable.appendChild(row);
  });
}

function renderStays() {
  elements.stayTable.innerHTML = "";
  state.stays.forEach((stay) => {
    const cat = state.cats.find((item) => item.id === stay.catId);
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${cat ? cat.name : ""}</td>
      <td>${stay.type === "single" ? "单间" : "幼儿园"}</td>
      <td>${stay.start}</td>
      <td>${stay.end}</td>
      <td>${formatCurrency(stay.unitPrice || 0)} × ${stay.days || 0}</td>
      <td>${formatCurrency(stay.fee)}</td>
      <td>
        <button data-action="edit" data-id="${stay.id}">编辑</button>
        <button data-action="delete" data-id="${stay.id}">删除</button>
      </td>
    `;
    elements.stayTable.appendChild(row);
  });
}

function renderVisits() {
  elements.visitTable.innerHTML = "";
  state.visits.forEach((visit) => {
    const owner = state.owners.find((item) => item.id === visit.ownerId);
    const frequencyMap = {
      daily: "每天",
      alternate: "隔一天",
      custom: "自定义",
    };
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${owner ? owner.name : ""}</td>
      <td>${visit.start} ~ ${visit.end}</td>
      <td>${frequencyMap[visit.frequency] || ""}</td>
      <td>${formatCurrency(visit.unitPrice || 0)} × ${visit.count || 0}</td>
      <td>${formatCurrency(visit.fee)}</td>
      <td>
        <button data-action="edit" data-id="${visit.id}">编辑</button>
        <button data-action="delete" data-id="${visit.id}">删除</button>
      </td>
    `;
    elements.visitTable.appendChild(row);
  });
}

function renderCareOptions() {
  elements.stayCareType.innerHTML = [
    '<option value="">不添加星标</option>',
    ...Object.entries(careTypeOptions).map(
      ([value, option]) => `<option value="${value}">${option.icon} ${option.label}</option>`
    ),
  ].join("");
}

function renderCalendar() {
  const year = calendarDate.getFullYear();
  const month = calendarDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const startDay = firstDay.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  elements.calendarTitle.textContent = `${year} 年 ${month + 1} 月`;
  elements.calendar.innerHTML = "";

  for (let i = 0; i < startDay; i += 1) {
    const placeholder = document.createElement("div");
    placeholder.className = "day";
    placeholder.innerHTML = `<header><span class="muted">&nbsp;</span></header>`;
    elements.calendar.appendChild(placeholder);
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(year, month, day);
    const dateKey = toDateKey(date);
    const dayCard = document.createElement("div");
    dayCard.className = "day";

    const staysForDay = state.stays.filter((stay) => {
      return dateKey >= stay.start && dateKey <= stay.end;
    });
    const visitsForDay = state.visits.filter((visit) => {
      const dates = getVisitDates(visit);
      return dates.includes(dateKey);
    });
    const careMarksForDay = state.careMarks.filter((mark) => mark.date === dateKey);
    const careByCat = careMarksForDay.reduce((result, mark) => {
      if (!result[mark.catId]) {
        result[mark.catId] = [];
      }
      result[mark.catId].push(mark);
      return result;
    }, {});

    const stayTags = staysForDay
      .map((stay) => {
        const cat = state.cats.find((item) => item.id === stay.catId);
        const typeLabel = stay.type === "single" ? "单间" : "幼儿园";
        const careIcons = (careByCat[stay.catId] || [])
          .map(
            (mark) =>
              `<span class="care-icon" data-care-id="${mark.id}" title="${getCareTypeLabel(
                mark.type
              )}">${getCareTypeIcon(mark.type)}</span>`
          )
          .join("");
        return `
          <span class="tag ${stay.type}" data-stay-id="${stay.id}">
            ${cat ? cat.name : ""} · ${typeLabel}
            ${careIcons ? `<span class="care-icons">${careIcons}</span>` : ""}
          </span>
        `;
      })
      .join("");
    const stayCatIds = new Set(staysForDay.map((stay) => stay.catId));
    const extraCareTags = Object.entries(
      careMarksForDay.reduce((result, mark) => {
        if (stayCatIds.has(mark.catId)) {
          return result;
        }
        if (!result[mark.catId]) {
          result[mark.catId] = [];
        }
        result[mark.catId].push(mark);
        return result;
      }, {})
    )
      .map(([catId, marks]) => {
        const cat = state.cats.find((item) => item.id === catId);
        const icons = marks
          .map(
            (mark) =>
              `<span class="care-icon" data-care-id="${mark.id}">${getCareTypeIcon(
                mark.type
              )}</span>`
          )
          .join("");
        return `<span class="tag care">${cat ? cat.name : ""} ${icons}</span>`;
      })
      .join("");
    const visitTags = visitsForDay
      .map((visit) => {
        const owner = state.owners.find((item) => item.id === visit.ownerId);
        return `<span class="tag visit" data-visit-id="${visit.id}">上门 · ${
          owner ? owner.name : ""
        }</span>`;
      })
      .join("");

    dayCard.innerHTML = `
      <header>
        <span>${day}</span>
        <span class="muted">${["日", "一", "二", "三", "四", "五", "六"][date.getDay()]}</span>
      </header>
      <div class="day-body">
        ${stayTags}
        ${visitTags}
        ${extraCareTags}
      </div>
    `;
    dayCard.dataset.date = dateKey;

    elements.calendar.appendChild(dayCard);
  }
}

function resetForms() {
  elements.ownerForm.reset();
  elements.ownerDiscount.value = "";
  elements.catForm.reset();
  elements.stayForm.reset();
  elements.visitForm.reset();
  elements.stayCareDate.value = "";
  elements.stayCareType.value = "";
  elements.stayCareNote.value = "";
  editing = {
    ownerId: null,
    catId: null,
    stayId: null,
    visitId: null,
    careId: null,
  };
}

function renderAll() {
  renderOwnerOptions();
  renderCatOptions();
  renderCareOptions();
  renderOwners();
  renderCats();
  renderStays();
  renderVisits();
  renderCareMarks();
  renderCalendar();
  updateDashboard();
  updateStayPricing();
  updateVisitPricing();
}

function setEditingForm(form, mode) {
  const button = form.querySelector("button.primary");
  if (button) {
    button.textContent = mode === "edit" ? "更新" : "保存";
  }
}

function startStayEdit(stayId) {
  const stay = state.stays.find((item) => item.id === stayId);
  if (!stay) {
    return;
  }
  editing.stayId = stayId;
  elements.stayCat.value = stay.catId;
  elements.stayType.value = stay.type;
  elements.stayStart.value = stay.start;
  elements.stayEnd.value = stay.end;
  elements.stayFee.value = stay.fee;
  elements.stayUnitPrice.value = stay.unitPrice || "";
  elements.stayDays.value = stay.days || 0;
  const matchingCare = state.careMarks.find(
    (mark) => mark.catId === stay.catId && mark.date === stay.start
  );
  elements.stayCareDate.value = matchingCare ? matchingCare.date : stay.start;
  elements.stayCareType.value = matchingCare ? matchingCare.type : "";
  elements.stayCareNote.value = matchingCare?.note || "";
  editing.careId = matchingCare?.id || null;
  setEditingForm(elements.stayForm, "edit");
  updateStayPricing();
}

function startVisitEdit(visitId) {
  const visit = state.visits.find((item) => item.id === visitId);
  if (!visit) {
    return;
  }
  editing.visitId = visitId;
  elements.visitOwner.value = visit.ownerId;
  elements.visitStart.value = visit.start;
  elements.visitEnd.value = visit.end;
  elements.visitFrequency.value = visit.frequency;
  elements.visitCustom.value = visit.customDates;
  elements.visitFee.value = visit.fee;
  elements.visitUnitPrice.value = visit.unitPrice || "";
  elements.visitCount.value = visit.count || 0;
  setEditingForm(elements.visitForm, "edit");
  updateVisitPricing();
}

elements.ownerForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const owner = {
    id: editing.ownerId || crypto.randomUUID(),
    name: elements.ownerName.value.trim(),
    contact: elements.ownerContact.value.trim(),
    discountPercent: Number(elements.ownerDiscount.value) || 0,
    note: elements.ownerNote.value.trim(),
  };
  if (!owner.name) {
    return;
  }
  if (editing.ownerId) {
    state.owners = state.owners.map((item) => (item.id === owner.id ? owner : item));
  } else {
    state.owners.push(owner);
  }
  saveState();
  resetForms();
  renderAll();
  setEditingForm(elements.ownerForm, "create");
});

elements.catForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const cat = {
    id: editing.catId || crypto.randomUUID(),
    name: elements.catName.value.trim(),
    ownerId: elements.catOwner.value,
    note: elements.catNote.value.trim(),
  };
  if (!cat.name) {
    return;
  }
  if (editing.catId) {
    state.cats = state.cats.map((item) => (item.id === cat.id ? cat : item));
  } else {
    state.cats.push(cat);
  }
  saveState();
  resetForms();
  renderAll();
  setEditingForm(elements.catForm, "create");
});

elements.stayForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const stayStart = elements.stayStart.value;
  const stayEnd = elements.stayEnd.value;
  const stayType = elements.stayType.value;
  const days = daysBetween(stayStart, stayEnd);
  const unitPrice = Number(elements.stayUnitPrice.value) || 0;
  const cat = state.cats.find((item) => item.id === elements.stayCat.value);
  const owner = state.owners.find((item) => item.id === cat?.ownerId);
  const discountPercent = Number(owner?.discountPercent) || 0;
  const discountFactor = Math.max(0, 1 - discountPercent / 100);
  const stay = {
    id: editing.stayId || crypto.randomUUID(),
    catId: elements.stayCat.value,
    type: stayType,
    start: stayStart,
    end: stayEnd,
    unitPrice,
    days,
    fee: unitPrice * days * discountFactor,
  };
  if (!stay.catId || !stay.start || !stay.end) {
    return;
  }
  if (editing.stayId) {
    state.stays = state.stays.map((item) => (item.id === stay.id ? stay : item));
  } else {
    state.stays.push(stay);
  }
  const careDate = elements.stayCareDate.value;
  const careType = elements.stayCareType.value;
  const careNote = elements.stayCareNote.value.trim();
  if (editing.careId && (!careDate || !careType)) {
    state.careMarks = state.careMarks.filter((item) => item.id !== editing.careId);
  } else if (careDate && careType) {
    const mark = {
      id: editing.careId || crypto.randomUUID(),
      catId: stay.catId,
      date: careDate,
      type: careType,
      note: careNote,
    };
    if (editing.careId) {
      state.careMarks = state.careMarks.map((item) => (item.id === mark.id ? mark : item));
    } else {
      state.careMarks.push(mark);
    }
  }
  saveState();
  resetForms();
  renderAll();
  setEditingForm(elements.stayForm, "create");
});

elements.visitForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const visitDraft = {
    start: elements.visitStart.value,
    end: elements.visitEnd.value,
    frequency: elements.visitFrequency.value,
    customDates: elements.visitCustom.value.trim(),
  };
  const count = getVisitCount(visitDraft);
  const unitPrice = Number(elements.visitUnitPrice.value) || 0;
  const visit = {
    id: editing.visitId || crypto.randomUUID(),
    ownerId: elements.visitOwner.value,
    start: visitDraft.start,
    end: visitDraft.end,
    frequency: visitDraft.frequency,
    customDates: visitDraft.customDates,
    unitPrice,
    count,
    fee: unitPrice * count,
  };
  if (!visit.ownerId || !visit.start || !visit.end) {
    return;
  }
  if (editing.visitId) {
    state.visits = state.visits.map((item) => (item.id === visit.id ? visit : item));
  } else {
    state.visits.push(visit);
  }
  saveState();
  resetForms();
  renderAll();
  setEditingForm(elements.visitForm, "create");
});

elements.careForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const mark = {
    id: editing.careId || crypto.randomUUID(),
    catId: elements.careCat.value,
    date: elements.careDate.value,
    type: elements.careType.value,
    note: elements.careNote.value.trim(),
  };
  if (!mark.catId || !mark.date) {
    return;
  }
  if (editing.careId) {
    state.careMarks = state.careMarks.map((item) => (item.id === mark.id ? mark : item));
  } else {
    state.careMarks.push(mark);
  }
  saveState();
  resetForms();
  renderAll();
  setEditingForm(elements.careForm, "create");
});

elements.ownerTable.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) {
    return;
  }
  const ownerId = button.dataset.id;
  if (button.dataset.action === "delete") {
    const catIds = state.cats.filter((cat) => cat.ownerId === ownerId).map((cat) => cat.id);
    state.owners = state.owners.filter((item) => item.id !== ownerId);
    state.cats = state.cats.filter((cat) => cat.ownerId !== ownerId);
    state.stays = state.stays.filter((stay) => !catIds.includes(stay.catId));
    state.careMarks = state.careMarks.filter((mark) => !catIds.includes(mark.catId));
    saveState();
    renderAll();
    return;
  }
  const owner = state.owners.find((item) => item.id === ownerId);
  if (!owner) {
    return;
  }
  editing.ownerId = ownerId;
  elements.ownerName.value = owner.name;
  elements.ownerContact.value = owner.contact;
  elements.ownerDiscount.value = owner.discountPercent || "";
  elements.ownerNote.value = owner.note;
  setEditingForm(elements.ownerForm, "edit");
});

elements.catTable.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) {
    return;
  }
  const catId = button.dataset.id;
  if (button.dataset.action === "delete") {
    state.cats = state.cats.filter((item) => item.id !== catId);
    state.stays = state.stays.filter((stay) => stay.catId !== catId);
    state.careMarks = state.careMarks.filter((mark) => mark.catId !== catId);
    saveState();
    renderAll();
    return;
  }
  const cat = state.cats.find((item) => item.id === catId);
  if (!cat) {
    return;
  }
  editing.catId = catId;
  elements.catName.value = cat.name;
  elements.catOwner.value = cat.ownerId;
  elements.catNote.value = cat.note;
  setEditingForm(elements.catForm, "edit");
});

elements.stayTable.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) {
    return;
  }
  const stayId = button.dataset.id;
  if (button.dataset.action === "delete") {
    state.stays = state.stays.filter((item) => item.id !== stayId);
    saveState();
    renderAll();
    return;
  }
  startStayEdit(stayId);
});

elements.visitTable.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) {
    return;
  }
  const visitId = button.dataset.id;
  if (button.dataset.action === "delete") {
    state.visits = state.visits.filter((item) => item.id !== visitId);
    saveState();
    renderAll();
    return;
  }
  startVisitEdit(visitId);
});

function updateVisitPricing() {
  const visitDraft = {
    start: elements.visitStart.value,
    end: elements.visitEnd.value,
    frequency: elements.visitFrequency.value,
    customDates: elements.visitCustom.value.trim(),
  };
  const count = getVisitCount(visitDraft);
  const unitPrice = Number(elements.visitUnitPrice.value) || 0;
  elements.visitCount.value = count;
  elements.visitFee.value = unitPrice * count;
}

function updateStayPricing() {
  const stayStart = elements.stayStart.value;
  const stayEnd = elements.stayEnd.value;
  const days = stayStart && stayEnd ? daysBetween(stayStart, stayEnd) : 0;
  const unitPrice = Number(elements.stayUnitPrice.value) || 0;
  const cat = state.cats.find((item) => item.id === elements.stayCat.value);
  const owner = state.owners.find((item) => item.id === cat?.ownerId);
  const discountPercent = Number(owner?.discountPercent) || 0;
  const discountFactor = Math.max(0, 1 - discountPercent / 100);
  elements.stayDays.value = days;
  elements.stayFee.value = unitPrice * days * discountFactor;
}

[
  elements.stayStart,
  elements.stayEnd,
  elements.stayCat,
  elements.stayUnitPrice,
].forEach((input) => {
  input.addEventListener("input", updateStayPricing);
});

[
  elements.visitStart,
  elements.visitEnd,
  elements.visitFrequency,
  elements.visitCustom,
  elements.visitUnitPrice,
].forEach((input) => {
  input.addEventListener("input", updateVisitPricing);
});

elements.calendar.addEventListener("click", (event) => {
  const stayTag = event.target.closest("[data-stay-id]");
  if (stayTag) {
    startStayEdit(stayTag.dataset.stayId);
    elements.stayForm.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }
  const visitTag = event.target.closest("[data-visit-id]");
  if (visitTag) {
    startVisitEdit(visitTag.dataset.visitId);
    elements.visitForm.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }
  const dayCard = event.target.closest(".day");
  if (dayCard?.dataset.date) {
    elements.stayCareDate.value = dayCard.dataset.date;
    elements.stayCareType.value = "";
    elements.stayCareNote.value = "";
    editing.careId = null;
    setEditingForm(elements.stayForm, "create");
    elements.stayForm.scrollIntoView({ behavior: "smooth", block: "start" });
    elements.stayCareType.focus();
  }
});

elements.prevMonth.addEventListener("click", () => {
  calendarDate = new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1);
  renderCalendar();
});

elements.nextMonth.addEventListener("click", () => {
  calendarDate = new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1);
  renderCalendar();
});

renderAll();
