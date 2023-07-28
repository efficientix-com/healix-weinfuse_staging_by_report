/**
 * @NApiVersion 2.1
 */
// eslint-disable-next-line no-undef
define([], () => {
  const RECORDS = {}

  RECORDS.CONFIG = {}
  RECORDS.CONFIG.ID = 'customrecord_weinfuse_config'
  RECORDS.CONFIG.FIELDS = {}
  RECORDS.CONFIG.FIELDS.INTERNALID = 'internalid'
  RECORDS.CONFIG.FIELDS.ISINACTIVE = 'isinactive'
  RECORDS.CONFIG.FIELDS.CLIENT_ID = 'custrecord_weinfuse_config_client_id'
  RECORDS.CONFIG.FIELDS.CLIENT_SECRET = 'custrecord_weinfuse_config_client_secret'
  RECORDS.CONFIG.FIELDS.URL1 = 'custrecord_weinfuse_config_url1'
  RECORDS.CONFIG.FIELDS.URL2 = 'custrecord_weinfuse_config_url2'
  RECORDS.CONFIG.FIELDS.URL3 = 'custrecord_weinfuse_config_url3'
  RECORDS.CONFIG.FIELDS.REPORT1 = 'custrecord_weinfuse_config_report1'
  RECORDS.CONFIG.FIELDS.REPORT2 = 'custrecord_weinfuse_config_report2'
  RECORDS.CONFIG.FIELDS.IS_CORE = 'custrecord_weinfuse_config_is_core'

  RECORDS.WEINFUSE = {}
  RECORDS.WEINFUSE.ID = 'customrecord_weinfuse'
  RECORDS.WEINFUSE.FIELDS = {}
  RECORDS.WEINFUSE.FIELDS.WE_INFUSE = 'custrecord_wi_we_infuse'
  RECORDS.WEINFUSE.FIELDS.LINE_ID = 'custrecord_wi_line_id'
  RECORDS.WEINFUSE.FIELDS.CUSTOMER = 'custrecord_wi_customer'
  RECORDS.WEINFUSE.FIELDS.LOCATION = 'custrecord_wi_location'
  RECORDS.WEINFUSE.FIELDS.SHIP_TO = 'custrecord_wi_ship_to'
  RECORDS.WEINFUSE.FIELDS.ITEM = 'custrecord_wi_item'
  RECORDS.WEINFUSE.FIELDS.NDC = 'custrecord_wi_ndc'
  RECORDS.WEINFUSE.FIELDS.UNIT = 'custrecord_wi_unit'
  RECORDS.WEINFUSE.FIELDS.QUANTITY = 'custrecord_wi_quantity'
  RECORDS.WEINFUSE.FIELDS.PRICE = 'custrecord_wi_price'
  RECORDS.WEINFUSE.FIELDS.DATE = 'custrecord_wi_date'
  RECORDS.WEINFUSE.FIELDS.VENDOR = 'custrecord_wi_vendor'
  RECORDS.WEINFUSE.FIELDS.EXPIRATION = 'custrecord_wi_expiration'
  RECORDS.WEINFUSE.FIELDS.TYPE = 'custrecord_wi_type'
  RECORDS.WEINFUSE.FIELDS.IA = 'custrecord_wi_ia'
  RECORDS.WEINFUSE.FIELDS.PO = 'custrecord_wi_po'
  RECORDS.WEINFUSE.FIELDS.TO = 'custrecord_wi_to'
  RECORDS.WEINFUSE.FIELDS.SO = 'custrecord_wi_so'
  RECORDS.WEINFUSE.FIELDS.RECEIPT = 'custrecord_wi_receipt'
  RECORDS.WEINFUSE.FIELDS.FULFILLMENT = 'custrecord_wi_fulfillment'
  RECORDS.WEINFUSE.FIELDS.STATUS = 'custrecord_wi_status'
  RECORDS.WEINFUSE.FIELDS.STAGING = 'custrecord_wi_staging'
  RECORDS.WEINFUSE.FIELDS.OBJECT_LINE = 'custrecord_wi_object_line'
  RECORDS.WEINFUSE.FIELDS.GROUP_ID = 'custrecord_wi_group_id'
  RECORDS.WEINFUSE.FIELDS.GROUP_NAME = 'custrecord_wi_group_name'
  RECORDS.WEINFUSE.FIELDS.LOCATION_ID = 'custrecord_wi_location_id'
  RECORDS.WEINFUSE.FIELDS.LOCATION_NAME = 'custrecord_wi_location_name'
  RECORDS.WEINFUSE.FIELDS.ORD_SER_ID = 'custrecord_wi_ord_ser_id'
  RECORDS.WEINFUSE.FIELDS.ORD_INV_ID = 'custrecord_wi_ord_inv_id'
  RECORDS.WEINFUSE.FIELDS.APPOINTMENT_INV = 'custrecord_wi_appointment_inv'
  RECORDS.WEINFUSE.FIELDS.PATIENTS_IDENT = 'custrecord_wi_patients_ident'
  RECORDS.WEINFUSE.FIELDS.OUTER_NDC = 'custrecord_wi_outer_ndc'
  RECORDS.WEINFUSE.FIELDS.ITEM_LABEL = 'custrecord_wi_item_label'
  RECORDS.WEINFUSE.FIELDS.UOM = 'custrecord_wi_uom'
  RECORDS.WEINFUSE.FIELDS.LOT = 'custrecord_wi_lot'
  RECORDS.WEINFUSE.FIELDS.INVENTORY_ITEM_ID = 'custrecord_wi_inventory_item_id'

  RECORDS.LOCATION = {}
  RECORDS.LOCATION.FIELDS = {}
  RECORDS.LOCATION.FIELDS.INTERNALID = 'internalid'
  RECORDS.LOCATION.FIELDS.NAME = 'name'
  RECORDS.LOCATION.FIELDS.ISINACTIVE = 'isinactive'

  RECORDS.STAGING = {}
  RECORDS.STAGING.ID = 'customrecord_staging'
  RECORDS.STAGING.FIELDS = {}
  RECORDS.STAGING.FIELDS.WE_INFUSE = 'custrecord_staging_we_infuse'
  RECORDS.STAGING.FIELDS.LINE_ID = 'custrecord_staging_line_id'
  RECORDS.STAGING.FIELDS.CUSTOMER = 'custrecord_staging_customer'
  RECORDS.STAGING.FIELDS.LOCATION = 'custrecord_staging_location'
  RECORDS.STAGING.FIELDS.SHIP_TO = 'custrecord_staging_ship_to'
  RECORDS.STAGING.FIELDS.ITEM = 'custrecord_staging_item'
  RECORDS.STAGING.FIELDS.ITEM_STATUS = 'custrecord_staging_item_status'
  RECORDS.STAGING.FIELDS.NDC = 'custrecord_staging_ndc'
  RECORDS.STAGING.FIELDS.UNIT = 'custrecord_staging_unit'
  RECORDS.STAGING.FIELDS.QUANTITY = 'custrecord_staging_quantity'
  RECORDS.STAGING.FIELDS.PRICE = 'custrecord_staging_price'
  RECORDS.STAGING.FIELDS.DATE = 'custrecord_staging_date'
  RECORDS.STAGING.FIELDS.TRANSACTION_CREATED = 'custrecord_staging_transaction_created'
  RECORDS.STAGING.FIELDS.LOT = 'custrecord_staging_lot'
  RECORDS.STAGING.FIELDS.PATIENTID = 'custrecord_staging_patient_id'

  const JSON_STRUCTURE = {}
  JSON_STRUCTURE.GROUP_ID = 'group.id'
  JSON_STRUCTURE.GROUP_NAME = 'group.name'
  JSON_STRUCTURE.LOCATION_ID = 'locations.id'
  JSON_STRUCTURE.LOCATION_NAME = 'locations.name'
  JSON_STRUCTURE.ORDER_SERIES_ID = 'orders_inventory.order_series_id'
  JSON_STRUCTURE.ORDERS_INVENTORY_ID = 'orders_inventory.id'
  JSON_STRUCTURE.APPOINTMENTS_INVENTORY_ID = 'appointments_inventory.id'
  JSON_STRUCTURE.APPOINTMENTS_INVENTORY_STATUS = 'appointments_inventory.status'
  JSON_STRUCTURE.PATIENTS_INVENTORY_ID = 'patients_inventory.id'
  JSON_STRUCTURE.PATIENTS_INVENTORY_IDENTIFIER = 'patients_inventory.identifier'
  JSON_STRUCTURE.ITEMS_NDC_CODE = 'inventory_items.ndc_code'
  JSON_STRUCTURE.ITEMS_OUTER_NDC_CODE = 'inventory_items.outer_ndc_code'
  JSON_STRUCTURE.ITEMS_LABEL_NAME = 'inventory_items.label_name'
  JSON_STRUCTURE.ITEMS_STRENGTH = 'inventory_items.strength'
  JSON_STRUCTURE.ITEMS_UOM = 'inventory_items.uom'
  JSON_STRUCTURE.ITEMS_LOT = 'inventory_items.lot'
  JSON_STRUCTURE.ITEMS_EXPIRATION_DATE = 'inventory_items.expiration_date'
  JSON_STRUCTURE.ITEMS_CREATED_TIME = 'inventory_items.created_time'
  JSON_STRUCTURE.ITEMS_INVENTORY_ITEM_ID = 'inventory_items.inventory_item_id'
  JSON_STRUCTURE.ITEMS_LINE_ITEM_ID = 'inventory_items.line_item_id'
  JSON_STRUCTURE.WEINFUSE_UID = 'patients_inventory.id'

  const LIST = {}

  LIST.WEINFUSE_STATUS = 'customlist_weinfuse_status'

  return { JSON_STRUCTURE, RECORDS, LIST }
})
