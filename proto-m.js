(function () {
  "use strict";

  const STORAGE_KEY = "spa-cz-admin-prototype";
  const STATE_KEYS = [
    "auth",
    "access",
    "connection",
    "density",
    "inv",
    "hotel",
  ];
  const FILTER_KEYS = [
    "queue",
    "reservationFilter",
    "offerFilter",
    "billingFilter",
  ];
  const CARRY_KEYS = STATE_KEYS.concat([
    "reservation",
    "offer",
    "queue",
    "reservationFilter",
    "offerFilter",
    "billingFilter",
    "from",
    "to",
    "section",
  ]);
  const OPTIONS = {
    auth: ["in", "out"],
    access: ["full", "read", "none"],
    connection: ["manual", "chm"],
    density: ["compact", "dense"],
    inv: ["many", "some", "none"],
    hotel: ["active", "test"],
    queue: ["all", "arrivals", "departures"],
    reservationFilter: ["all", "confirmed", "pending", "cancelled"],
    offerFilter: ["all", "active", "spa", "missing"],
    billingFilter: ["pending", "approved", "disputed"],
  };
  const DEFAULTS = Object.freeze({
    auth: "in",
    access: "full",
    connection: "manual",
    density: "dense",
    inv: "many",
    hotel: "active",
    reservation: "RSV-10482",
    offer: "cajkovskij-stay",
    queue: "all",
    reservationFilter: "all",
    offerFilter: "all",
    billingFilter: "pending",
    from: "2026-09-12",
    to: "2026-10-12",
    section: "",
    availabilityMutations: Object.freeze({}),
    packageDrafts: Object.freeze({}),
  });
  let state = readState();
  let toastTimer = 0;
  let returnFocus = null;

  function language() {
    return document.documentElement.lang === "cs" ? "cs" : "en";
  }

  function readState() {
    let stored = {};
    try {
      stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    } catch (error) {
      stored = {};
    }
    const next = Object.assign({}, DEFAULTS, stored);
    STATE_KEYS.forEach((key) => {
      try {
        const panelValue = localStorage.getItem("proto:" + key);
        if (panelValue) next[key] = panelValue;
      } catch (error) {
        // URL state remains available when storage is restricted.
      }
    });
    const query = new URLSearchParams(location.search);
    CARRY_KEYS.forEach((key) => {
      if (query.has(key)) next[key] = query.get(key);
    });
    Object.keys(OPTIONS).forEach((key) => {
      if (!OPTIONS[key].includes(next[key])) next[key] = DEFAULTS[key];
    });
    next.availabilityMutations = normalizeAvailabilityMutations(
      next.availabilityMutations,
    );
    next.packageDrafts = normalizePackageDrafts(next.packageDrafts);
    return next;
  }

  function normalizeAvailabilityMutations(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    return Object.fromEntries(
      Object.entries(value).flatMap(([key, mutation]) => {
        if (!/^[a-z0-9-]+:\d{4}-\d{2}-\d{2}$/.test(key)) return [];
        if (mutation && mutation.type === "stopSell") {
          return [[key, { type: "stopSell" }]];
        }
        if (
          mutation &&
          mutation.type === "units" &&
          Number.isInteger(mutation.value) &&
          mutation.value >= 0 &&
          mutation.value <= 255
        ) {
          return [[key, { type: "units", value: mutation.value }]];
        }
        return [];
      }),
    );
  }

  function normalizePackageDrafts(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    return Object.fromEntries(
      Object.entries(value).flatMap(([id, draft]) => {
        if (!/^local-package-[1-9]\d*$/.test(id)) return [];
        if (!draft || typeof draft !== "object" || Array.isArray(draft))
          return [];
        const title = typeof draft.title === "string" ? draft.title.trim() : "";
        if (!title || title.length > 160) return [];
        if (
          !Number.isInteger(draft.nights) ||
          draft.nights < 1 ||
          draft.nights > 365
        )
          return [];
        return [[id, { title, nights: draft.nights }]];
      }),
    );
  }

  function persistState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      // The shareable URL is authoritative.
    }
  }

  function stateQuery() {
    const query = new URLSearchParams();
    CARRY_KEYS.forEach((key) => {
      if (state[key] !== "") query.set(key, state[key]);
    });
    return query;
  }

  function replaceUrlState() {
    const query = stateQuery().toString();
    history.replaceState(
      null,
      "",
      location.pathname + (query ? "?" + query : "") + location.hash,
    );
  }

  function withState(href) {
    if (!href || href.startsWith("#") || /^(mailto:|tel:|https?:)/.test(href))
      return href;
    const target = new URL(href, location.href);
    stateQuery().forEach((value, key) => {
      if (!target.searchParams.has(key)) target.searchParams.set(key, value);
    });
    return target.pathname.split("/").pop() + target.search + target.hash;
  }

  function wireStateLinks() {
    document
      .querySelectorAll(
        "a[data-carry-state], .mobile-bottom-nav a, .langswitch a",
      )
      .forEach((link) => {
        const original = link.dataset.baseHref || link.getAttribute("href");
        if (!original) return;
        link.dataset.baseHref = original;
        link.setAttribute("href", withState(original));
      });
  }

  function fixtures(id) {
    const script = document.getElementById(id);
    if (!script) return [];
    try {
      return JSON.parse(script.textContent);
    } catch (error) {
      return [];
    }
  }

  function packageDuration(nights) {
    const days = nights + 1;
    if (language() === "cs") {
      const dayLabel = days === 1 ? "den" : days <= 4 ? "dny" : "dní";
      const nightLabel = nights === 1 ? "noc" : nights <= 4 ? "noci" : "nocí";
      return `${days} ${dayLabel} / ${nights} ${nightLabel}`;
    }
    return `${days} ${days === 1 ? "day" : "days"} / ${nights} ${nights === 1 ? "night" : "nights"}`;
  }

  function packageDraftTemplate() {
    return fixtures("package-draft-fixture")[0] || null;
  }

  function packageFromDraft(id, draft) {
    const template = packageDraftTemplate();
    if (!template) return null;
    const sequence = Number(id.slice("local-package-".length));
    return {
      ...template,
      id,
      rank: 4 + sequence,
      title: draft.title,
      duration: packageDuration(draft.nights),
      nights: draft.nights,
    };
  }

  function resolvedOffers() {
    const base = fixtures("offer-fixtures");
    const drafts = Object.entries(state.packageDrafts)
      .map(([id, draft]) => packageFromDraft(id, draft))
      .filter(Boolean);
    return base.concat(drafts);
  }

  function packageEditorHref(offerId, section) {
    const page = `m-rate-edit${language() === "cs" ? "" : "-en"}.html`;
    const query = new URLSearchParams({ offer: offerId, section });
    return withState(`${page}?${query.toString()}`);
  }

  function renderCreatedOffers() {
    const list = document.querySelector(".offer-list");
    const template = document.getElementById("created-offer-template");
    if (!list || !template) return;
    list.querySelectorAll("[data-created-package]").forEach((node) =>
      node.remove(),
    );
    Object.entries(state.packageDrafts).forEach(([id, draft]) => {
      const offer = packageFromDraft(id, draft);
      if (!offer) return;
      const card = template.content.firstElementChild.cloneNode(true);
      card.dataset.inventoryRank = String(offer.rank);
      card.dataset.offerId = offer.id;
      card.querySelector("[data-created-offer-title]").textContent = offer.title;
      card.querySelector("[data-created-offer-duration]").textContent =
        offer.duration;
      card.querySelector("[data-created-offer-meal]").textContent = offer.meal;
      card.querySelector("[data-created-offer-edit]").href = packageEditorHref(
        offer.id,
        "package",
      );
      card.querySelector("[data-created-offer-rates]").href = packageEditorHref(
        offer.id,
        "rates",
      );
      list.append(card);
    });
  }

  function syncPackageSurface(offer) {
    const editor = document.querySelector("[data-package-editor-surface]");
    const rates = document.querySelector("[data-package-rates-surface]");
    if (!editor || !rates) return;
    const editing = state.section === "package";
    editor.hidden = !editing;
    rates.hidden = editing;
    document.querySelectorAll("[data-offer-route]").forEach((link) => {
      link.href = packageEditorHref(offer.id, link.dataset.offerRoute);
    });
  }

  function setPackageCreateError(form, message) {
    const error = form.querySelector("[data-package-create-error]");
    if (!error) return;
    error.textContent = message || "";
    error.hidden = !message;
  }

  function nextPackageId() {
    const used = new Set(
      resolvedOffers()
        .map((offer) => offer.id)
        .filter(Boolean),
    );
    let sequence = 1;
    while (used.has(`local-package-${sequence}`)) sequence += 1;
    return `local-package-${sequence}`;
  }

  function createPackageDraft(form) {
    if (state.access !== "full") return false;
    const title = form.querySelector("[data-package-create-title]").value.trim();
    const nights = Number(
      form.querySelector("[data-package-create-nights]").value,
    );
    if (!title || title.length > 160) {
      setPackageCreateError(
        form,
        language() === "cs"
          ? "Zadejte název balíčku."
          : "Enter a package name.",
      );
      return false;
    }
    if (!Number.isInteger(nights) || nights < 1 || nights > 365) {
      setPackageCreateError(
        form,
        language() === "cs"
          ? "Počet nocí musí být celé číslo od 1 do 365."
          : "Number of nights must be a whole number from 1 to 365.",
      );
      return false;
    }
    const id = nextPackageId();
    state.packageDrafts[id] = { title, nights };
    state.offer = id;
    state.section = "package";
    persistState();
    location.assign(packageEditorHref(id, "package"));
    return true;
  }

  function canWriteAvailability() {
    return state.access === "full" && state.connection === "manual";
  }

  function availabilityCellState(cell) {
    const mutation = state.availabilityMutations[cell.dataset.availabilityId];
    if (mutation) return mutation;
    if (cell.dataset.defaultState === "stopSell") return { type: "stopSell" };
    return { type: "units", value: Number(cell.dataset.defaultValue) };
  }

  function availabilityBaseState(cell) {
    if (cell.dataset.defaultState === "stopSell") return { type: "stopSell" };
    return { type: "units", value: Number(cell.dataset.defaultValue) };
  }

  function sameAvailabilityState(left, right) {
    return (
      left.type === right.type &&
      (left.type === "stopSell" || left.value === right.value)
    );
  }

  function parseAvailabilityUnits(raw) {
    const normalized = String(raw).trim();
    const value = Number(normalized);
    if (
      !/^\d+$/.test(normalized) ||
      !Number.isInteger(value) ||
      value < 0 ||
      value > 255
    ) {
      return null;
    }
    return value;
  }

  function availabilityDateLabel(dateId) {
    return new Intl.DateTimeFormat(language() === "cs" ? "cs-CZ" : "en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    }).format(new Date(dateId + "T00:00:00Z"));
  }

  function availabilityRoomLabel(cell) {
    return (
      cell
        .closest("tr")
        ?.querySelector(".sticky-col strong")
        ?.textContent.trim() || cell.dataset.roomTypeId
    );
  }

  function availabilityStateLabel(value) {
    if (value.type === "stopSell")
      return language() === "cs" ? "Stop prodej (×)" : "Stop sell (×)";
    return language() === "cs"
      ? `${value.value} volných jednotek`
      : `${value.value} available units`;
  }

  function renderAvailability() {
    document.querySelectorAll(".availability-cell").forEach((cell) => {
      const value = availabilityCellState(cell);
      const control = cell.querySelector("[data-availability-control]");
      const stopped = value.type === "stopSell";
      cell.classList.toggle("stop", stopped);
      cell.classList.toggle("low", !stopped && value.value <= 1);
      if (!control) return;
      control.textContent = stopped ? "×" : String(value.value);
      control.setAttribute(
        "aria-label",
        `${availabilityRoomLabel(cell)}, ${availabilityDateLabel(cell.dataset.dateId)}: ${availabilityStateLabel(value)}. ${language() === "cs" ? "Nastavit dostupnost" : "Set availability"}`,
      );
    });
  }

  function setAvailabilityMutation(cell, value) {
    const key = cell.dataset.availabilityId;
    if (sameAvailabilityState(availabilityBaseState(cell), value)) {
      delete state.availabilityMutations[key];
    } else {
      state.availabilityMutations[key] =
        value.type === "stopSell"
          ? { type: "stopSell" }
          : { type: "units", value: value.value };
    }
  }

  function saveAvailabilityCells(cells, value) {
    if (!canWriteAvailability() || !cells.length) return false;
    cells.forEach((cell) => setAvailabilityMutation(cell, value));
    persistState();
    renderAvailability();
    return true;
  }

  function saveAvailabilityCell(cell, value) {
    return saveAvailabilityCells(cell ? [cell] : [], value);
  }

  function syncAvailabilityAction(form) {
    if (!form) return;
    const stopSell =
      form.querySelector("[data-availability-cell-action]").value ===
      "stopSell";
    const field = form.querySelector("[data-availability-cell-units-field]");
    const input = form.querySelector("[data-availability-cell-units]");
    field.hidden = stopSell;
    input.disabled = stopSell;
    input.required = !stopSell;
  }

  function setAvailabilityError(form, message) {
    const error = form.querySelector("[data-availability-cell-error]");
    error.textContent = message || "";
    error.hidden = !message;
  }

  function syncAvailabilityBulkAction(form) {
    if (!form) return;
    const stopSell =
      form.querySelector("[data-availability-bulk-action]").value ===
      "stopSell";
    const field = form.querySelector("[data-availability-bulk-units-field]");
    const input = form.querySelector("[data-availability-bulk-units]");
    field.hidden = stopSell;
    input.disabled = stopSell;
    input.required = !stopSell;
  }

  function setAvailabilityBulkError(form, message) {
    const error = form.querySelector("[data-availability-bulk-error]");
    error.textContent = message || "";
    error.hidden = !message;
  }

  function availabilityBulkSelection(form) {
    const from = form.querySelector("[data-availability-bulk-from]").value;
    const to = form.querySelector("[data-availability-bulk-to]").value;
    const roomTypeId = form.querySelector(
      "[data-availability-bulk-room]",
    ).value;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
      return {
        cells: [],
        error:
          language() === "cs"
            ? "Vyberte platné datum od a do."
            : "Select valid from and to dates.",
      };
    }
    if (from > to) {
      return {
        cells: [],
        error:
          language() === "cs"
            ? "Datum od nesmí být po datu do."
            : "The from date cannot be after the to date.",
      };
    }
    const cells = [...document.querySelectorAll(".availability-cell")].filter(
      (cell) =>
        cell.dataset.dateId >= from &&
        cell.dataset.dateId <= to &&
        (roomTypeId === "all" || cell.dataset.roomTypeId === roomTypeId),
    );
    if (!cells.length) {
      return {
        cells,
        error:
          language() === "cs"
            ? "Vybraný rozsah neobsahuje žádné buňky."
            : "The selected range contains no cells.",
      };
    }
    return { cells, error: "" };
  }

  function updateAvailabilityBulkPreview(form) {
    if (!form) return { cells: [], error: "" };
    const selection = availabilityBulkSelection(form);
    form.querySelector("[data-availability-bulk-count]").textContent = String(
      selection.cells.length,
    );
    setAvailabilityBulkError(form, selection.error);
    return selection;
  }

  function openAvailabilityBulkEditor(control) {
    if (!canWriteAvailability()) return;
    const form = document.querySelector("[data-availability-bulk-form]");
    if (!form) return;
    syncAvailabilityBulkAction(form);
    updateAvailabilityBulkPreview(form);
    openSheet("availability-sheet", control);
  }

  function openAvailabilityEditor(control) {
    if (!canWriteAvailability()) return;
    const cell = control.closest(".availability-cell");
    const form = document.querySelector("[data-availability-cell-form]");
    if (!cell || !form) return;
    const current = availabilityCellState(cell);
    form.dataset.availabilityId = cell.dataset.availabilityId;
    setText("[data-availability-cell-room]", availabilityRoomLabel(cell));
    setText(
      "[data-availability-cell-date]",
      availabilityDateLabel(cell.dataset.dateId),
    );
    setText(
      "[data-availability-cell-current]",
      availabilityStateLabel(current),
    );
    form.querySelector("[data-availability-cell-action]").value = current.type;
    form.querySelector("[data-availability-cell-units]").value =
      current.type === "units" ? String(current.value) : "0";
    setAvailabilityError(form, "");
    syncAvailabilityAction(form);
    openSheet("availability-cell-sheet", control);
  }

  function submitAvailabilityEditor(form) {
    if (!canWriteAvailability()) return false;
    const cell = document.querySelector(
      `.availability-cell[data-availability-id="${CSS.escape(form.dataset.availabilityId || "")}"]`,
    );
    const action = form.querySelector("[data-availability-cell-action]").value;
    let next = { type: "stopSell" };
    if (action === "units") {
      const raw = form
        .querySelector("[data-availability-cell-units]")
        .value.trim();
      const value = parseAvailabilityUnits(raw);
      if (value === null) {
        setAvailabilityError(
          form,
          language() === "cs"
            ? "Zadejte celé číslo od 0 do 255."
            : "Enter a whole number from 0 to 255.",
        );
        return false;
      }
      next = { type: "units", value };
    }
    if (!saveAvailabilityCell(cell, next)) return false;
    closeSheet(form.closest(".modal-backdrop"));
    showToast(
      language() === "cs"
        ? "Dostupnost byla uložena."
        : "Availability was saved.",
    );
    return true;
  }

  function submitAvailabilityBulk(form) {
    if (!canWriteAvailability()) return false;
    const selection = updateAvailabilityBulkPreview(form);
    if (selection.error) return false;
    const action = form.querySelector("[data-availability-bulk-action]").value;
    let next = { type: "stopSell" };
    if (action === "units") {
      const value = parseAvailabilityUnits(
        form.querySelector("[data-availability-bulk-units]").value,
      );
      if (value === null) {
        setAvailabilityBulkError(
          form,
          language() === "cs"
            ? "Zadejte celé číslo od 0 do 255."
            : "Enter a whole number from 0 to 255.",
        );
        return false;
      }
      next = { type: "units", value };
    } else if (action !== "stopSell") {
      return false;
    }
    if (!saveAvailabilityCells(selection.cells, next)) return false;
    closeSheet(form.closest(".modal-backdrop"));
    showToast(
      language() === "cs"
        ? `Dostupnost byla změněna v ${selection.cells.length} buňkách.`
        : `Availability was changed in ${selection.cells.length} cells.`,
    );
    return true;
  }

  function formatCurrency(value) {
    if (value == null) return "—";
    return new Intl.NumberFormat(language() === "cs" ? "cs-CZ" : "en-GB", {
      style: "currency",
      currency: "CZK",
      maximumFractionDigits: 0,
    }).format(value);
  }

  function setText(selector, value) {
    document.querySelectorAll(selector).forEach((node) => {
      node.textContent = value;
    });
  }

  function setIdentity(found) {
    document.body.dataset.identityStatus = found ? "found" : "missing";
    document.querySelectorAll(".identity-found").forEach((node) => {
      node.hidden = !found;
    });
    document.querySelectorAll(".identity-missing").forEach((node) => {
      node.hidden = found;
    });
  }

  function hydrateReservation() {
    const list = fixtures("reservation-fixtures");
    if (!list.length) return;
    const reservation = list.find((entry) => entry.id === state.reservation);
    setIdentity(Boolean(reservation));
    if (!reservation) return;
    setText('[data-reservation-field="id"]', reservation.id);
    setText('[data-reservation-field="status"]', reservation.status);
    setText('[data-reservation-field="stay"]', reservation.stay);
    setText('[data-reservation-field="duration"]', reservation.duration);
    setText('[data-reservation-field="guest"]', reservation.guest);
    setText(
      '[data-reservation-field="additionalGuest"]',
      reservation.additionalGuest,
    );
    setText(
      '[data-reservation-field="price"]',
      formatCurrency(reservation.price),
    );
    setText("[data-reservation-sheet-id]", reservation.id);
    document
      .querySelectorAll('[data-reservation-field="status"]')
      .forEach((node) => {
        node.className = "status " + reservation.statusClass;
      });
  }

  function hydrateOffer() {
    const list = resolvedOffers();
    if (!list.length) return;
    const offer = list.find((entry) => entry.id === state.offer);
    setIdentity(Boolean(offer));
    if (!offer) return;
    setText('[data-offer-field="id"]', offer.id);
    setText('[data-offer-field="title"]', offer.title);
    setText('[data-offer-field="duration"]', offer.duration);
    setText('[data-offer-field="meal"]', offer.meal);
    setText('[data-offer-field="price"]', formatCurrency(offer.price));
    document
      .querySelectorAll('[data-offer-field="publication"]')
      .forEach((node) => {
        node.className = `status ${offer.active ? "success" : "warning"}`;
        node.textContent = offer.active
          ? language() === "cs"
            ? "Aktivní"
            : "Active"
          : language() === "cs"
            ? "Koncept"
            : "Draft";
      });
    document.querySelectorAll('[data-offer-input="title"]').forEach((input) => {
      input.value = offer.title;
    });
    document
      .querySelectorAll('[data-offer-input="duration"]')
      .forEach((input) => {
        input.value = offer.duration;
      });
    const relationByRoomType = new Map(
      (offer.roomPrices || []).map((relation) => [
        relation.roomTypeId,
        relation,
      ]),
    );
    document
      .querySelectorAll(".rate-matrix tbody tr[data-room-type-id]")
      .forEach((row) => {
        const relation = relationByRoomType.get(row.dataset.roomTypeId);
        const eligible = Boolean(relation && relation.eligible);
        row.hidden = !eligible;
        const roomName = row
          .querySelector(".sticky-col strong")
          .textContent.trim();
        row.querySelectorAll("[data-rate-date-id]").forEach((input) => {
          const value = eligible
            ? relation.prices[input.dataset.rateDateId]
            : null;
          input.value = value == null ? "" : String(value);
          input.setAttribute(
            "aria-label",
            `${offer.title}, ${roomName}: ${input.value || (language() === "cs" ? "bez ceny" : "missing price")} CZK`,
          );
        });
      });
    syncPackageSurface(offer);
  }

  function inventoryAllows(node) {
    const rank = Number(node.dataset.inventoryRank || 1);
    return state.inv === "many" || (state.inv === "some" && rank <= 3);
  }

  function applyReservationFilter() {
    const cards = [
      ...document.querySelectorAll(
        ".reservation-card[data-reservation-status]",
      ),
    ];
    if (!cards.length) return;
    let visible = 0;
    cards.forEach((card) => {
      const statusMatch =
        state.reservationFilter === "all" ||
        card.dataset.reservationStatus === state.reservationFilter;
      const queueMatch =
        state.queue === "all" ||
        card.dataset.reservationQueues.split(/\s+/).includes(state.queue);
      const show =
        inventoryAllows(card) &&
        statusMatch &&
        queueMatch &&
        state.inv !== "none";
      card.hidden = !show;
      if (show) visible += 1;
    });
    setText("[data-reservation-count]", String(visible));
    const empty = document.querySelector("[data-reservation-empty]");
    if (empty) empty.hidden = visible !== 0 || state.inv === "none";
    document.querySelectorAll("[data-reservation-filter]").forEach((button) => {
      const active =
        button.dataset.reservationFilter === state.reservationFilter;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });
  }

  function applyOfferFilter() {
    const cards = [...document.querySelectorAll(".offer-card[data-offer-id]")];
    if (!cards.length) return;
    const matches = {
      all: () => true,
      active: (card) => card.dataset.offerActive === "true",
      spa: (card) => card.dataset.offerSpa === "true",
      missing: (card) => card.dataset.offerHasRates === "false",
    };
    let visible = 0;
    cards.forEach((card) => {
      const show =
        state.inv !== "none" &&
        inventoryAllows(card) &&
        matches[state.offerFilter](card);
      card.hidden = !show;
      if (show) visible += 1;
    });
    const filterCounts = {
      all: cards.length,
      active: cards.filter((card) => matches.active(card)).length,
      spa: cards.filter((card) => matches.spa(card)).length,
      missing: cards.filter((card) => matches.missing(card)).length,
    };
    Object.entries(filterCounts).forEach(([filter, count]) =>
      setText(`[data-offer-filter-count="${filter}"]`, String(count)),
    );
    setText("[data-offer-count]", String(visible));
    const empty = document.querySelector("[data-offer-empty]");
    if (empty) empty.hidden = visible !== 0 || state.inv === "none";
    document.querySelectorAll("[data-offer-filter]").forEach((button) => {
      const active = button.dataset.offerFilter === state.offerFilter;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });
  }

  function applyBillingFilter() {
    const cards = [
      ...document.querySelectorAll(".billing-card[data-billing-status]"),
    ];
    if (!cards.length) return;
    let visible = 0;
    cards.forEach((card) => {
      const show =
        state.inv !== "none" &&
        inventoryAllows(card) &&
        card.dataset.billingStatus === state.billingFilter;
      card.hidden = !show;
      if (show) visible += 1;
    });
    setText("[data-billing-count]", String(visible));
    const empty = document.querySelector("[data-billing-empty]");
    if (empty) empty.hidden = visible !== 0 || state.inv === "none";
    document.querySelectorAll("[data-billing-filter]").forEach((button) => {
      const active = button.dataset.billingFilter === state.billingFilter;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });
  }

  function applyState() {
    STATE_KEYS.forEach((key) => {
      document.body.dataset[key] = state[key];
    });
    document.querySelectorAll("[data-write-action]").forEach((control) => {
      const disabled =
        state.access !== "full" ||
        (control.hasAttribute("data-chm-write") && state.connection === "chm");
      control.disabled = disabled;
      control.setAttribute("aria-disabled", String(disabled));
    });
    document.querySelectorAll("[data-state-key]").forEach((control) => {
      const active =
        state[control.dataset.stateKey] === control.dataset.stateValue;
      control.classList.toggle("active", active);
      control.setAttribute("aria-pressed", String(active));
    });
    document.querySelectorAll("[data-state-output]").forEach((node) => {
      node.textContent = CARRY_KEYS.filter((key) => state[key] !== "")
        .map((key) => key + "=" + state[key])
        .join(" · ");
    });
    document.querySelectorAll("[data-result-count]").forEach((node) => {
      const countKey =
        state.inv === "many"
          ? "countMany"
          : state.inv === "some"
            ? "countSome"
            : "countNone";
      if (node.dataset[countKey]) node.textContent = node.dataset[countKey];
    });
    renderCreatedOffers();
    hydrateReservation();
    hydrateOffer();
    renderAvailability();
    applyReservationFilter();
    applyOfferFilter();
    applyBillingFilter();
    wireStateLinks();
    persistState();
  }

  function setState(key, value) {
    if (OPTIONS[key] && !OPTIONS[key].includes(value)) return;
    state[key] = value;
    replaceUrlState();
    applyState();
  }

  function initPrototypeTools() {
    if (!window.protoTools || typeof window.protoTools.init !== "function")
      return;
    window.protoTools.init({
      title: "SPA.CZ · prototype",
      raised: true,
      carry: CARRY_KEYS,
      changelog: true,
      usecases: { label: "Use cases" },
      comments: true,
      switches: [
        {
          key: "auth",
          label: "Account",
          persist: true,
          default: DEFAULTS.auth,
          options: [
            ["in", "Signed in"],
            ["out", "Signed out"],
          ],
        },
        {
          key: "access",
          label: "Access",
          persist: true,
          default: DEFAULTS.access,
          options: [
            ["full", "Full"],
            ["read", "Read only"],
            ["none", "No access"],
          ],
        },
        {
          key: "connection",
          label: "Connection",
          persist: true,
          default: DEFAULTS.connection,
          options: [
            ["manual", "Manual"],
            ["chm", "Channel manager"],
          ],
        },
        {
          key: "density",
          label: "Density",
          persist: true,
          default: DEFAULTS.density,
          short: true,
          options: [
            ["compact", "Compact"],
            ["dense", "Dense"],
          ],
        },
        {
          key: "inv",
          label: "Record volume",
          persist: true,
          default: DEFAULTS.inv,
          options: [
            ["many", "Many"],
            ["some", "Some"],
            ["none", "None"],
          ],
        },
        {
          key: "hotel",
          label: "Property",
          persist: true,
          default: DEFAULTS.hotel,
          short: true,
          options: [
            ["active", "Active"],
            ["test", "Test"],
          ],
        },
      ],
    });
    const panel = document.querySelector(".proto-tools");
    if (panel && window.matchMedia("(max-width: 700px)").matches)
      panel.classList.add("mini");
  }

  function showToast(message) {
    const toast = document.querySelector(".toast");
    if (!toast || !message) return;
    clearTimeout(toastTimer);
    toast.textContent = message;
    toast.classList.add("show");
    toastTimer = window.setTimeout(() => toast.classList.remove("show"), 2600);
  }

  function openSheet(id, opener) {
    const backdrop = document.getElementById(id);
    if (!backdrop || backdrop.classList.contains("open")) return;
    returnFocus = opener || document.activeElement;
    backdrop.classList.add("open");
    backdrop.setAttribute("aria-hidden", "false");
    document.body.dataset.sheet = id;
    const target =
      backdrop.querySelector(
        "[data-sheet-initial-focus], .sheet-body input, .sheet-body select, .sheet-body textarea, .sheet-body button, .sheet-body a, [data-close-sheet]",
      ) || backdrop.querySelector(".bottom-sheet");
    if (target) {
      window.setTimeout(() => {
        if (backdrop.classList.contains("open") && target.isConnected) {
          target.focus({ preventScroll: true });
        }
      }, 0);
    }
  }

  function closeSheet(backdrop, restore = true) {
    if (!backdrop) return;
    backdrop.classList.remove("open");
    backdrop.setAttribute("aria-hidden", "true");
    delete document.body.dataset.sheet;
    if (restore && returnFocus && returnFocus.isConnected) returnFocus.focus();
    returnFocus = null;
  }

  function trapSheetFocus(event) {
    if (event.key !== "Tab") return;
    const sheet = document.querySelector(".modal-backdrop.open");
    if (!sheet) return;
    const focusable = [
      ...sheet.querySelectorAll(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
    ].filter((node) => !node.hidden);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function initInteractions() {
    document.addEventListener("click", (event) => {
      const terminal = event.target.closest("[data-terminal]");
      if (terminal) {
        event.preventDefault();
        showToast(terminal.dataset.terminalMessage);
        return;
      }

      const stateControl = event.target.closest("[data-state-key]");
      if (stateControl) {
        event.preventDefault();
        setState(
          stateControl.dataset.stateKey,
          stateControl.dataset.stateValue,
        );
        closeSheet(stateControl.closest(".modal-backdrop"));
        return;
      }

      const availabilityControl = event.target.closest(
        "[data-availability-control]",
      );
      if (availabilityControl) {
        event.preventDefault();
        openAvailabilityEditor(availabilityControl);
        return;
      }

      const availabilityBulkControl = event.target.closest(
        "[data-availability-bulk-open]",
      );
      if (availabilityBulkControl) {
        event.preventDefault();
        openAvailabilityBulkEditor(availabilityBulkControl);
        return;
      }

      const opener = event.target.closest("[data-open-sheet]");
      if (opener) {
        event.preventDefault();
        openSheet(opener.dataset.openSheet, opener);
        return;
      }

      const closer = event.target.closest("[data-close-sheet]");
      if (closer) {
        event.preventDefault();
        closeSheet(closer.closest(".modal-backdrop"));
        return;
      }

      if (event.target.classList.contains("modal-backdrop")) {
        closeSheet(event.target);
        return;
      }

      const reservationFilter = event.target.closest(
        "[data-reservation-filter]",
      );
      if (reservationFilter) {
        setState(
          "reservationFilter",
          reservationFilter.dataset.reservationFilter,
        );
        return;
      }
      const offerFilter = event.target.closest("[data-offer-filter]");
      if (offerFilter) {
        setState("offerFilter", offerFilter.dataset.offerFilter);
        return;
      }
      const billingFilter = event.target.closest("[data-billing-filter]");
      if (billingFilter) {
        setState("billingFilter", billingFilter.dataset.billingFilter);
        return;
      }

      const gridShift = event.target.closest("[data-grid-shift]");
      if (gridShift) {
        const grid = document.querySelector(".matrix-wrap");
        if (grid)
          grid.scrollBy({
            left: Number(gridShift.dataset.gridShift) * 260,
            behavior: "smooth",
          });
        return;
      }

      const approval = event.target.closest("[data-approval]");
      if (approval && state.access === "full") {
        const card = approval.closest(".billing-card");
        const status = card && card.querySelector(".status");
        if (card) card.dataset.billingStatus = "approved";
        if (status) {
          status.className = "status success";
          status.textContent = language() === "cs" ? "Schváleno" : "Approved";
        }
        showToast(approval.dataset.success);
        applyBillingFilter();
        return;
      }

      const saveRates = event.target.closest("[data-save-rates]");
      if (saveRates && !saveRates.disabled) {
        showToast(saveRates.dataset.success);
      }
    });

    document.addEventListener("submit", (event) => {
      const packageCreateForm = event.target.closest(
        "[data-package-create-form]",
      );
      if (packageCreateForm) {
        event.preventDefault();
        createPackageDraft(packageCreateForm);
        return;
      }
      const availabilityForm = event.target.closest(
        "[data-availability-cell-form]",
      );
      if (availabilityForm) {
        event.preventDefault();
        submitAvailabilityEditor(availabilityForm);
        return;
      }
      const availabilityBulkForm = event.target.closest(
        "[data-availability-bulk-form]",
      );
      if (availabilityBulkForm) {
        event.preventDefault();
        submitAvailabilityBulk(availabilityBulkForm);
        return;
      }
      const form = event.target.closest("[data-prototype-form]");
      if (!form) return;
      event.preventDefault();
      closeSheet(form.closest(".modal-backdrop"));
      showToast(form.dataset.success);
    });

    document.addEventListener("change", (event) => {
      if (event.target.matches("[data-availability-cell-action]")) {
        const form = event.target.closest("[data-availability-cell-form]");
        setAvailabilityError(form, "");
        syncAvailabilityAction(form);
      }
      if (event.target.matches("[data-availability-bulk-action]")) {
        const form = event.target.closest("[data-availability-bulk-form]");
        syncAvailabilityBulkAction(form);
        updateAvailabilityBulkPreview(form);
      }
      if (
        event.target.matches(
          "[data-availability-bulk-from], [data-availability-bulk-to], [data-availability-bulk-room]",
        )
      ) {
        updateAvailabilityBulkPreview(
          event.target.closest("[data-availability-bulk-form]"),
        );
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        const open = document.querySelector(".modal-backdrop.open");
        if (open) {
          event.preventDefault();
          closeSheet(open);
        }
        return;
      }
      trapSheetFocus(event);
    });
  }

  function observePanelState() {
    const observer = new MutationObserver((mutations) => {
      let changed = false;
      mutations.forEach((mutation) => {
        const key =
          mutation.attributeName &&
          mutation.attributeName.replace(/^data-/, "");
        const value = key && document.body.dataset[key];
        if (
          STATE_KEYS.includes(key) &&
          OPTIONS[key].includes(value) &&
          state[key] !== value
        ) {
          state[key] = value;
          changed = true;
        }
      });
      if (changed) {
        replaceUrlState();
        applyState();
      }
    });
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: STATE_KEYS.map((key) => "data-" + key),
    });
  }

  function boot() {
    initPrototypeTools();
    state = readState();
    applyState();
    observePanelState();
    initInteractions();
    if (document.body.dataset.page === "more" && state.section === "changes") {
      window.requestAnimationFrame(() => openSheet("changes-sheet", null));
    }
    if (window.protoComments && typeof window.protoComments.init === "function")
      window.protoComments.init();
  }

  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})();
