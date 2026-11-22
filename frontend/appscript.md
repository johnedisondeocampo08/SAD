const FIELD_MAP = {
  customerName: 'Customer name',
  phoneNumber: 'Phone number',
  email: 'Email address',
  notes: 'Booking notes or personalization details',
  deliveryAddress: 'Delivery address',
};

const BOOKING_ITEM_FIELDS = [
  { product: 'Product 1', quantity: 'Quantity 1' },
  { product: 'Product 2', quantity: 'Quantity 2' },
  { product: 'Product 3', quantity: 'Quantity 3' },
];

function onFormSubmit(e) {
  if (!e || !e.range) {
    throw new Error('This function must run from a spreadsheet form-submit trigger.');
  }

  const properties = PropertiesService.getScriptProperties();
  const url = properties.getProperty('BOOKING_API_URL');
  const token = properties.getProperty('BOOKING_API_TOKEN');

  if (!url || !token) {
    throw new Error('Set BOOKING_API_URL and BOOKING_API_TOKEN in Script Properties.');
  }

  if (!/^https:\/\/.+\/api\/booking-requests\/?$/i.test(url)) {
    throw new Error('BOOKING_API_URL must be the public HTTPS booking-requests endpoint.');
  }

  const sheet = e.range.getSheet();
  const spreadsheet = sheet.getParent();
  const row = e.range.getRow();
  const headers = sheet
    .getRange(1, 1, 1, sheet.getLastColumn())
    .getDisplayValues()[0];

  const namedValues = e.namedValues || {};
  const get = (header) =>
    ((namedValues[header] && namedValues[header][0]) || '').toString().trim();

  const items = BOOKING_ITEM_FIELDS.flatMap(({ product, quantity }) => {
    const productName = get(product);
    const quantityText = get(quantity);

    if (!productName || productName.toLowerCase() === 'none') {
      if (quantityText) {
        throw new Error(`Choose a product for ${quantity} or leave its quantity blank.`);
      }
      return [];
    }

    if (!/^[1-9]\d*$/.test(quantityText)) {
      throw new Error(`Quantity for "${productName}" must be a whole number greater than zero.`);
    }

    return [{ productName, quantity: Number(quantityText) }];
  });

  if (!items.length) {
    throw new Error('Choose at least one product to book.');
  }

  const dateHeader = 'Requested booking date';
  const dateColumn = headers.indexOf(dateHeader) + 1;

  if (!dateColumn) {
    throw new Error(`Missing spreadsheet header: ${dateHeader}`);
  }

  const rawDate = sheet.getRange(row, dateColumn).getValue();
  let requestedDate = '';

  if (rawDate instanceof Date && !Number.isNaN(rawDate.getTime())) {
    requestedDate = Utilities.formatDate(
      rawDate,
      spreadsheet.getSpreadsheetTimeZone(),
      'yyyy-MM-dd'
    );
  } else {
    const dateText = get(dateHeader);
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateText)) {
      requestedDate = dateText;
    }
  }

  const payload = {
    submissionId: `${spreadsheet.getId()}:${sheet.getSheetId()}:${row}`,
    customerName: get(FIELD_MAP.customerName),
    phoneNumber: get(FIELD_MAP.phoneNumber),
    email: get(FIELD_MAP.email),
    items,
    requestedDate,
    notes: get(FIELD_MAP.notes),
    deliveryAddress: get(FIELD_MAP.deliveryAddress),
  };

  const missing = ['customerName', 'phoneNumber', 'requestedDate']
    .filter((key) => !payload[key]);

  if (missing.length) {
    throw new Error(`Required booking answer is missing: ${missing.join(', ')}.`);
  }

  const response = UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    headers: {
      Authorization: `Bearer ${token}`,
      'ngrok-skip-browser-warning': 'true',
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  });

  const code = response.getResponseCode();
  let result;

  try {
    result = JSON.parse(response.getContentText());
  } catch {
    throw new Error(
      `Booking API returned a non-JSON response (HTTP ${code}). Check the tunnel URL.`
    );
  }

  if ((code !== 200 && code !== 201) || result.success !== true) {
    const message = typeof result.message === 'string'
      ? result.message
      : 'Request was not accepted.';

    throw new Error(`Booking API failed (HTTP ${code}): ${message}`);
  }
}

function checkBookingProperties() {
  const properties = PropertiesService.getScriptProperties();
  const url = properties.getProperty('BOOKING_API_URL') || '';
  const token = properties.getProperty('BOOKING_API_TOKEN') || '';

  Logger.log(JSON.stringify({
    hasUrl: Boolean(url),
    hasToken: Boolean(token),
    urlLooksRight: /^https:\/\/.+\/api\/booking-requests\/?$/i.test(url),
  }));
}

function installTrigger() {
  const spreadsheet = SpreadsheetApp.getActive();

  ScriptApp.getProjectTriggers()
    .filter((trigger) =>
      trigger.getHandlerFunction() === 'onFormSubmit' &&
      trigger.getTriggerSourceId() === spreadsheet.getId()
    )
    .forEach((trigger) => ScriptApp.deleteTrigger(trigger));

  ScriptApp.newTrigger('onFormSubmit')
    .forSpreadsheet(spreadsheet)
    .onFormSubmit()
    .create();
}