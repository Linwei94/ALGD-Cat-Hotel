const STORAGE_KEY = "cat-hotel-data";
const defaultState = {
  prices: {
    single: 35,
    group: 28,
  },
  owners: [],
  cats: [],
  stays: [],
  visits: [],
};

let state = loadState();
let editing = {
  ownerId: null,
  catId: null,
  stayId: null,
  visitId: null,
};
let calendarDate = new Date();

const elements = {
  singlePrice: document.getElementById("singlePrice"),
  groupPrice: document.getElementById("groupPrice"),
  savePrices: document.getElementById("savePrices"),
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
  stayFee: document.getElementById("stayFee"),
  stayTable: document.getElementById("stayTable").querySelector("tbody"),
  visitForm: document.getElementById("visitForm"),
  visitOwner: document.getElementById("visitOwner"),
  visitStart: document.getElementById("visitStart"),
  visitEnd: document.getElementById("visitEnd"),
  visitFrequency: document.getElementById("visitFrequency"),
  visitCustom: document.getElementById("visitCustom"),
  visitFee: document.getElementById("visitFee"),
  visitTable: document.getElementById("visitTable").querySelector("tbody"),
  calendar: document.getElementById("calendar"),
  calendarTitle: document.getElementById("calendarTitle"),
  prevMonth: document.getElementById("prevMonth"),
  nextMonth: document.getElementById("nextMonth"),
  monthlyRevenue: document.getElementById("monthlyRevenue"),
  monthlyCats: document.getElementById("monthlyCats"),
  monthlyVisits: document.getElementById("monthlyVisits"),
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
  return input
    .split(/,|，/)
    .map((value) => value.trim())
    .filter(Boolean);
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

function renderPriceInputs() {
  elements.singlePrice.value = state.prices.single;
  elements.groupPrice.value = state.prices.group;
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
      <td>${formatCurrency(visit.fee)}</td>
      <td>
        <button data-action="edit" data-id="${visit.id}">编辑</button>
        <button data-action="delete" data-id="${visit.id}">删除</button>
      </td>
    `;
    elements.visitTable.appendChild(row);
  });
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

    const stayTags = staysForDay
      .map((stay) => {
        const cat = state.cats.find((item) => item.id === stay.catId);
        const typeLabel = stay.type === "single" ? "单间" : "幼儿园";
        return `<span class="tag ${stay.type}">${cat ? cat.name : ""} · ${typeLabel}</span>`;
      })
      .join("");
    const visitTags = visitsForDay
      .map((visit) => {
        const owner = state.owners.find((item) => item.id === visit.ownerId);
        return `<span class="tag visit">上门 · ${owner ? owner.name : ""}</span>`;
      })
      .join("");

    dayCard.innerHTML = `
      <header>
        <span>${day}</span>
        <span class="muted">${["日", "一", "二", "三", "四", "五", "六"][date.getDay()]}</span>
      </header>
      ${stayTags}
      ${visitTags}
    `;

    elements.calendar.appendChild(dayCard);
  }
}

function resetForms() {
  elements.ownerForm.reset();
  elements.ownerDiscount.value = "";
  elements.catForm.reset();
  elements.stayForm.reset();
  elements.visitForm.reset();
  editing = {
    ownerId: null,
    catId: null,
    stayId: null,
    visitId: null,
  };
}

function renderAll() {
  renderPriceInputs();
  renderOwnerOptions();
  renderCatOptions();
  renderOwners();
  renderCats();
  renderStays();
  renderVisits();
  renderCalendar();
  updateDashboard();
}

function setEditingForm(form, mode) {
  const button = form.querySelector("button.primary");
  if (button) {
    button.textContent = mode === "edit" ? "更新" : "保存";
  }
}

elements.savePrices.addEventListener("click", () => {
  state.prices.single = Number(elements.singlePrice.value) || 0;
  state.prices.group = Number(elements.groupPrice.value) || 0;
  saveState();
  updateDashboard();
});

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
  const feeInput = Number(elements.stayFee.value) || 0;
  const defaultFee = stayType === "single" ? state.prices.single : state.prices.group;
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
    fee: feeInput || defaultFee * days * discountFactor,
  };
  if (!stay.catId || !stay.start || !stay.end) {
    return;
  }
  if (editing.stayId) {
    state.stays = state.stays.map((item) => (item.id === stay.id ? stay : item));
  } else {
    state.stays.push(stay);
  }
  saveState();
  resetForms();
  renderAll();
  setEditingForm(elements.stayForm, "create");
});

elements.visitForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const visit = {
    id: editing.visitId || crypto.randomUUID(),
    ownerId: elements.visitOwner.value,
    start: elements.visitStart.value,
    end: elements.visitEnd.value,
    frequency: elements.visitFrequency.value,
    customDates: elements.visitCustom.value.trim(),
    fee: Number(elements.visitFee.value) || 0,
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

elements.ownerTable.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) {
    return;
  }
  const ownerId = button.dataset.id;
  if (button.dataset.action === "delete") {
    state.owners = state.owners.filter((item) => item.id !== ownerId);
    state.cats = state.cats.filter((cat) => cat.ownerId !== ownerId);
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
  setEditingForm(elements.stayForm, "edit");
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
  setEditingForm(elements.visitForm, "edit");
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
