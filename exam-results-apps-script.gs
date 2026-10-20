const RESULTS_SPREADSHEET_ID = '1Ru3yiW8dxi-mrZFSvTGOdl7pqEb5WnT0FPzlofRHeqg';
const RESULTS_SHEET_NAME = 'Resultados';
const FAILURES_SHEET_NAME = 'Fallos';
const RESULTS_TIME_ZONE = 'Europe/Madrid';

function doGet(e) {
  const action = String((e && e.parameter && e.parameter.action) || '');
  if (action !== 'exam-status') {
    return jsonResponse_({ ok: false, error: 'Acción no permitida.' }, e);
  }

  const examId = cleanText_((e.parameter && e.parameter.id) || '', 100);
  if (!isValidExamId_(examId)) {
    return jsonResponse_({ ok: false, found: false }, e);
  }

  const spreadsheet = SpreadsheetApp.openById(RESULTS_SPREADSHEET_ID);
  const resultsSheet = requiredSheet_(spreadsheet, RESULTS_SHEET_NAME);
  const found = findExamRow_(resultsSheet, examId) !== null;
  return jsonResponse_({ ok: true, found: found }, e);
}

function doPost(e) {
  try {
    const payload = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    const saved = saveExamResult_(payload);
    return jsonResponse_(saved);
  } catch (error) {
    console.error(error);
    return jsonResponse_({ ok: false, error: 'No se pudo guardar el resultado.' });
  }
}

function saveExamResult_(payload) {
  const examId = cleanText_(payload.id, 100);
  const restaurant = safeCellText_(payload.restaurant, 120);
  const personName = safeCellText_(payload.personName, 120);
  const score = Number(payload.score);
  const total = Number(payload.total);

  if (!isValidExamId_(examId) || !restaurant || !personName) {
    throw new Error('Datos obligatorios incompletos.');
  }
  if (!Number.isInteger(score) || !Number.isInteger(total) || total < 1 || total > 100 || score < 0 || score > total) {
    throw new Error('Puntuación no válida.');
  }

  const failures = Array.isArray(payload.failures)
    ? payload.failures.slice(0, total).map(normalizeFailure_)
    : [];

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const spreadsheet = SpreadsheetApp.openById(RESULTS_SPREADSHEET_ID);
    const resultsSheet = requiredSheet_(spreadsheet, RESULTS_SHEET_NAME);
    const failuresSheet = requiredSheet_(spreadsheet, FAILURES_SHEET_NAME);

    const existingRow = findExamRow_(resultsSheet, examId);
    if (existingRow !== null) {
      return { ok: true, duplicate: true };
    }

    const now = new Date();
    const date = Utilities.formatDate(now, RESULTS_TIME_ZONE, 'dd/MM/yyyy');
    const time = Utilities.formatDate(now, RESULTS_TIME_ZONE, 'HH:mm:ss');
    let failuresStartRow = null;

    if (failures.length > 0) {
      failuresStartRow = Math.max(failuresSheet.getLastRow() + 1, 2);
      const rows = failures.map(function (failure, index) {
        return [
          examId,
          failure.question || index + 1,
          restaurant,
          date,
          time,
          personName,
          failure.dish,
          failure.selected,
          failure.correct,
          failure.reason,
        ];
      });
      failuresSheet.getRange(failuresStartRow, 1, rows.length, 10).setValues(rows);
    }

    const resultRow = Math.max(resultsSheet.getLastRow() + 1, 2);
    resultsSheet.getRange(resultRow, 1, 1, 7).setValues([[
      restaurant,
      date,
      time,
      personName,
      score + ' / ' + total,
      '',
      examId,
    ]]);

    const failuresCell = resultsSheet.getRange(resultRow, 6);
    if (failuresStartRow === null) {
      failuresCell.setValue('Sin fallos');
    } else {
      const failuresEndRow = failuresStartRow + failures.length - 1;
      const failuresUrl = spreadsheet.getUrl()
        + '#gid=' + failuresSheet.getSheetId()
        + '&range=A' + failuresStartRow + ':J' + failuresEndRow;
      const link = SpreadsheetApp.newRichTextValue()
        .setText('Ver ' + failures.length + (failures.length === 1 ? ' fallo' : ' fallos'))
        .setLinkUrl(failuresUrl)
        .build();
      failuresCell.setRichTextValue(link);
    }

    SpreadsheetApp.flush();
    return { ok: true, duplicate: false };
  } finally {
    lock.releaseLock();
  }
}

function normalizeFailure_(failure) {
  return {
    question: Math.max(1, Math.min(100, Number(failure.question) || 1)),
    dish: safeCellText_(failure.dish, 220),
    selected: safeCellText_(failure.selected, 600) || 'Sin respuesta',
    correct: safeCellText_(failure.correct, 600),
    reason: safeCellText_(failure.reason, 600) || 'Respuesta incorrecta',
  };
}

function findExamRow_(sheet, examId) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return null;
  const match = sheet.getRange(2, 7, lastRow - 1, 1)
    .createTextFinder(examId)
    .matchEntireCell(true)
    .findNext();
  return match ? match.getRow() : null;
}

function requiredSheet_(spreadsheet, name) {
  const sheet = spreadsheet.getSheetByName(name);
  if (!sheet) throw new Error('No existe la pestaña ' + name + '.');
  return sheet;
}

function isValidExamId_(value) {
  return /^[A-Za-z0-9_-]{12,100}$/.test(value);
}

function cleanText_(value, maxLength) {
  return String(value == null ? '' : value)
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

function safeCellText_(value, maxLength) {
  const text = cleanText_(value, maxLength);
  return /^[=+\-@]/.test(text) ? "'" + text : text;
}

function jsonResponse_(payload, e) {
  const json = JSON.stringify(payload);
  const callback = e && e.parameter ? String(e.parameter.callback || '') : '';
  if (callback && /^[A-Za-z_$][0-9A-Za-z_$.]*$/.test(callback)) {
    return ContentService
      .createTextOutput(callback + '(' + json + ');')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService
    .createTextOutput(json)
    .setMimeType(ContentService.MimeType.JSON);
}
