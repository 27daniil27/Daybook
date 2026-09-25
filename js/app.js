/* =========================================================
   Daybook — app.js
   Локальное хранилище записей (localStorage), навигация
   между экранами, PIN-авторизация, режим Read-Only / Edit.
   ========================================================= */
(function () {
  "use strict";

  /* ---------- Константы ---------- */
  var STORAGE_KEY = "daybook.entries";
  var THEME_KEY = "daybook.theme";
  var DEMO_PIN = "1234";
  var MOODS = {
    1: "😞",
    2: "🙁",
    3: "😐",
    4: "🙂",
    5: "😄"
  };

  /* ---------- Демо-данные ---------- */
  var SEED = [
    {
      id: 1,
      title: "Прогулка в парке",
      date: "2026-09-20",
      mood: 5,
      tags: ["отдых", "природа"],
      text: "Погода была просто отличная! Гулял по парку почти два часа, сделал несколько удачных фотографов и наконец-то закончил книгу, которую тянул весь месяц.",
      photo: "assets/img/photo-1.svg"
    },
    {
      id: 2,
      title: "Рабочая неделя началась",
      date: "2026-09-21",
      mood: 3,
      tags: ["работа"],
      text: "Понедельник прошёл ровно: планёрка, пара созвонов и задачи на неделю. Ничего особенного, но и не скучно.",
      photo: ""
    },
    {
      id: 3,
      title: "Тренировка после работы",
      date: "2026-09-22",
      mood: 4,
      tags: ["спорт", "здоровье"],
      text: "Успел в зал до закрытия. Приседания и кардио, после чего — отличный сон гарантирован.",
      photo: "assets/img/photo-2.svg"
    },
    {
      id: 4,
      title: "Вечер с друзьями",
      date: "2026-09-23",
      mood: 5,
      tags: ["друзья", "отдых"],
      text: "Собрались у Андрея, заказали пиццу и смотрели старые фильмы. Смеха было больше, чем за всю прошлую неделю.",
      photo: ""
    }
  ];

  /* ---------- Состояние ---------- */
  var entries = loadEntries();
  var pin = "";
  var currentId = null;
  var selectedMood = 3;
  var pendingPhoto = "";

  /* ---------- Утилиты ---------- */
  function $(selector) {
    return document.querySelector(selector);
  }

  function $all(selector) {
    return Array.prototype.slice.call(document.querySelectorAll(selector));
  }

  function loadEntries() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch (e) {
      /* повреждённые данные — начинаем заново */
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED));
    return SEED.slice();
  }

  function saveEntries() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    } catch (e) {
      alert("Не удалось сохранить запись: хранилище браузера переполнено.");
    }
  }

  function formatDate(iso) {
    var parts = iso.split("-");
    var d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    return d.toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "long",
      year: "numeric"
    });
  }

  function escapeHtml(str) {
    var div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  function todayIso() {
    var d = new Date();
    var m = String(d.getMonth() + 1).padStart(2, "0");
    var day = String(d.getDate()).padStart(2, "0");
    return d.getFullYear() + "-" + m + "-" + day;
  }

  /* ---------- Навигация по экранам ---------- */
  function showScreen(name) {
    $all(".screen").forEach(function (screen) {
      var active = screen.id === "screen-" + name;
      screen.hidden = !active;
      screen.classList.toggle("is-active", active);
    });

    /* Закрываем мобильное меню после перехода */
    nav.classList.remove("is-open");
    navToggle.setAttribute("aria-expanded", "false");

    window.scrollTo(0, 0);

    if (name === "feed") {
      renderFeed();
    }
    if (name === "new") {
      resetEntryForm();
    }
  }

  var nav = $("#site-nav");
  var navToggle = $(".nav-toggle");

  navToggle.addEventListener("click", function () {
    var open = nav.classList.toggle("is-open");
    navToggle.setAttribute("aria-expanded", String(open));
  });

  $all("[data-screen-link]").forEach(function (link) {
    link.addEventListener("click", function (e) {
      e.preventDefault();
      showScreen(link.getAttribute("data-screen-link"));
    });
  });

  /* ---------- Тема ---------- */
  var themeToggle = $(".theme-toggle");

  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute("content", theme === "dark" ? "#121212" : "#F9F9F9");
    }
    localStorage.setItem(THEME_KEY, theme);
  }

  var savedTheme = localStorage.getItem(THEME_KEY);
  if (!savedTheme) {
    savedTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  applyTheme(savedTheme);

  themeToggle.addEventListener("click", function () {
    var next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
    applyTheme(next);
  });

  /* ---------- Экран 1: PIN-авторизация ---------- */
  var pinDots = $all(".pin-dots__dot");
  var pinDotsBox = $(".pin-dots");
  var pinHint = $("#pin-hint");

  function renderPin() {
    pinDots.forEach(function (dot, i) {
      dot.classList.toggle("is-filled", i < pin.length);
    });
    pinDotsBox.setAttribute("aria-label", "Введено " + pin.length + " из 4 цифр");
  }

  function resetPin() {
    pin = "";
    renderPin();
    pinDotsBox.classList.remove("is-error");
  }

  function submitPin() {
    if (pin === DEMO_PIN) {
      resetPin();
      showScreen("feed");
    } else {
      pinDotsBox.classList.add("is-error");
      pinHint.textContent = "Неверный PIN-код. Попробуйте снова (демо: 1234).";
      setTimeout(function () {
        resetPin();
        pinHint.innerHTML = 'Демо-код: <b>1234</b>';
      }, 900);
      pin = "";
      renderPin();
    }
  }

  function bioLogin() {
    pinHint.textContent = "Проверка биометрии…";
    setTimeout(function () {
      pinHint.innerHTML = 'Демо-код: <b>1234</b>';
      resetPin();
      showScreen("feed");
    }, 700);
  }

  $all(".keypad__key").forEach(function (key) {
    key.addEventListener("click", function () {
      var value = key.getAttribute("data-key");

      if (value === "bio") {
        bioLogin();
        return;
      }
      if (value === "del") {
        pin = pin.slice(0, -1);
        renderPin();
        return;
      }
      if (pin.length < 4) {
        pin += value;
        renderPin();
        if (pin.length === 4) {
          setTimeout(submitPin, 200);
        }
      }
    });
  });

  document.addEventListener("keydown", function (e) {
    if ($("#screen-auth").hidden) {
      return;
    }
    if (/^[0-9]$/.test(e.key) && pin.length < 4) {
      pin += e.key;
      renderPin();
      if (pin.length === 4) {
        setTimeout(submitPin, 200);
      }
    } else if (e.key === "Backspace") {
      pin = pin.slice(0, -1);
      renderPin();
    }
  });

  /* ---------- Экран 2: Лента ---------- */
  var feedList = $("#feed-list");
  var feedEmpty = $("#feed-empty");
  var searchInput = $("#search-input");

  function cardTemplate(entry) {
    var photo = entry.photo
      ? '<img class="card__photo" src="' + escapeHtml(entry.photo) + '" alt="" loading="lazy">'
      : "";
    var tags = entry.tags
      .map(function (t) {
        return '<span class="tag">#' + escapeHtml(t) + "</span>";
      })
      .join("");

    return (
      '<article class="card" tabindex="0" data-id="' + entry.id + '">' +
      photo +
      '<div class="card__body">' +
      '<div class="card__meta">' +
      '<time class="card__date" datetime="' + entry.date + '">' + formatDate(entry.date) + "</time>" +
      '<span class="card__mood" title="Настроение">' + (MOODS[entry.mood] || MOODS[3]) + "</span>" +
      "</div>" +
      '<h2 class="card__title">' + escapeHtml(entry.title) + "</h2>" +
      '<p class="card__text">' + escapeHtml(entry.text) + "</p>" +
      '<div class="card__tags">' + tags + "</div>" +
      "</div>" +
      "</article>"
    );
  }

  function renderFeed() {
    var query = searchInput.value.trim().toLowerCase();
    var list = entries.slice().sort(function (a, b) {
      return a.date < b.date ? 1 : -1;
    });

    if (query) {
      list = list.filter(function (e) {
        var haystack = (e.title + " " + e.text + " " + e.tags.join(" ")).toLowerCase();
        return haystack.indexOf(query) !== -1;
      });
    }

    feedList.innerHTML = list.map(cardTemplate).join("");
    feedEmpty.hidden = list.length > 0;
  }

  searchInput.addEventListener("input", renderFeed);

  feedList.addEventListener("click", function (e) {
    var card = e.target.closest(".card");
    if (card) {
      openDetail(Number(card.getAttribute("data-id")));
    }
  });

  feedList.addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
      var card = e.target.closest(".card");
      if (card) {
        openDetail(Number(card.getAttribute("data-id")));
      }
    }
  });

  /* ---------- Экран 3: Детализация ---------- */
  var detailCard = $("#detail-card");
  var detailPhoto = $("#detail-photo");
  var detailDate = $("#detail-date");
  var detailMood = $("#detail-mood");
  var detailTitle = $("#detail-title");
  var detailTitleInput = $("#detail-title-input");
  var detailTags = $("#detail-tags");
  var detailText = $("#detail-text");
  var detailTextInput = $("#detail-text-input");
  var detailActions = $("#detail-actions");
  var modeToggle = $("#mode-toggle");
  var modeLabel = $("#mode-label");

  function currentEntry() {
    return entries.filter(function (e) {
      return e.id === currentId;
    })[0];
  }

  function openDetail(id) {
    currentId = id;
    modeToggle.checked = false;
    setEditMode(false);
    renderDetail();
    showScreen("detail");
  }

  function renderDetail() {
    var entry = currentEntry();
    if (!entry) {
      showScreen("feed");
      return;
    }

    if (entry.photo) {
      detailPhoto.src = entry.photo;
      detailPhoto.hidden = false;
      detailCard.classList.add("detail--with-photo");
    } else {
      detailPhoto.hidden = true;
      detailCard.classList.remove("detail--with-photo");
    }

    detailDate.textContent = formatDate(entry.date);
    detailDate.setAttribute("datetime", entry.date);
    detailMood.textContent = MOODS[entry.mood] || MOODS[3];
    detailTitle.textContent = entry.title;
    detailTitleInput.value = entry.title;
    detailText.textContent = entry.text;
    detailTextInput.value = entry.text;
    detailTags.innerHTML = entry.tags
      .map(function (t) {
        return '<span class="tag">#' + escapeHtml(t) + "</span>";
      })
      .join("");
  }

  function setEditMode(on) {
    detailTitle.hidden = !on;
    detailTitleInput.hidden = on;
    detailText.hidden = !on;
    detailTextInput.hidden = on;
    detailActions.hidden = !on;
    modeLabel.textContent = on ? "Редактирование" : "Только чтение";
    if (on) {
      detailTitleInput.value = detailTitle.textContent;
      detailTextInput.value = currentEntry() ? currentEntry().text : "";
    }
  }

  modeToggle.addEventListener("change", function () {
    setEditMode(modeToggle.checked);
  });

  $("#detail-cancel").addEventListener("click", function () {
    modeToggle.checked = false;
    setEditMode(false);
    renderDetail();
  });

  $("#detail-save").addEventListener("click", function () {
    var entry = currentEntry();
    if (!entry) {
      return;
    }
    var title = detailTitleInput.value.trim();
    var text = detailTextInput.value.trim();
    if (!title || !text) {
      alert("Заголовок и текст не могут быть пустыми.");
      return;
    }
    entry.title = title;
    entry.text = text;
    saveEntries();
    modeToggle.checked = false;
    setEditMode(false);
    renderDetail();
  });

  $("#detail-delete").addEventListener("click", function () {
    if (!confirm("Удалить запись без возможности восстановления?")) {
      return;
    }
    entries = entries.filter(function (e) {
      return e.id !== currentId;
    });
    saveEntries();
    currentId = null;
    showScreen("feed");
  });

  /* ---------- Экран 4: Новая запись ---------- */
  var entryForm = $("#entry-form");
  var entryDate = $("#entry-date");
  var photoInput = $("#entry-photo");
  var photoPreview = $("#photo-preview");

  function resetEntryForm() {
    entryForm.reset();
    entryDate.value = todayIso();
    selectedMood = 3;
    pendingPhoto = "";
    photoPreview.hidden = true;
    $all(".mood__option").forEach(function (opt) {
      opt.setAttribute("aria-checked", String(Number(opt.getAttribute("data-mood")) === selectedMood));
    });
  }

  $all(".mood__option").forEach(function (opt) {
    opt.addEventListener("click", function () {
      selectedMood = Number(opt.getAttribute("data-mood"));
      $all(".mood__option").forEach(function (o) {
        o.setAttribute("aria-checked", String(o === opt));
      });
    });
  });

  photoInput.addEventListener("change", function () {
    var file = photoInput.files[0];
    if (!file) {
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      alert("Файл слишком большой. Максимальный размер — 2 МБ.");
      photoInput.value = "";
      return;
    }
    var reader = new FileReader();
    reader.onload = function (ev) {
      pendingPhoto = ev.target.result;
      photoPreview.src = pendingPhoto;
      photoPreview.hidden = false;
    };
    reader.readAsDataURL(file);
  });

  entryForm.addEventListener("submit", function (e) {
    e.preventDefault();

    var title = $("#entry-title").value.trim();
    var text = $("#entry-text").value.trim();
    var date = entryDate.value || todayIso();
    var tags = $("#entry-tags").value
      .split(",")
      .map(function (t) {
        return t.trim().replace(/^#/, "");
      })
      .filter(Boolean);

    if (!title || !text) {
      alert("Заполните заголовок и текст записи.");
      return;
    }

    entries.push({
      id: Date.now(),
      title: title,
      date: date,
      mood: selectedMood,
      tags: tags,
      text: text,
      photo: pendingPhoto
    });
    saveEntries();
    showScreen("feed");
  });

  /* ---------- Старт ---------- */
  entryDate.value = todayIso();
  showScreen("auth");
})();
