/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */

define([
  'N/config',
  'N/https',
  'N/log',
  'N/record',
  'N/search',
  './FB - Const Lib Staging by report.js',
  './extras/moment.js'
], /**
 * @param {config} config
 * @param {https} https
 * @param {log} log
 * @param {record} record
 * @param {search} search
 * @param {constLib} constLib
 * @param {moment} moment
 */ (config, https, log, record, search, constLib, moment) => {
  const { JSON_STRUCTURE, RECORDS } = constLib
  const MAIN_CONFIG = {}
  /**
   * Defines the function that is executed at the beginning of the map/reduce process and generates the input data.
   * @param {Object} inputContext
   * @param {boolean} inputContext.isRestarted - Indicates whether the current invocation of this function is the first
   *     invocation (if true, the current invocation is not the first invocation and this function has been restarted)
   * @param {Object} inputContext.ObjectRef - Object that references the input data
   * @typedef {Object} ObjectRef
   * @property {string|number} ObjectRef.id - Internal ID of the record instance that contains the input data
   * @property {string} ObjectRef.type - Type of the record instance that contains the input data
   * @returns {Array|Object|Search|ObjectRef|File|Query} The input data to use in the map/reduce process
   * @since 2015.2
   */

  const getInputData = inputContext => {
    try {
      const data = []
      log.audit('Step:', 'Get Configuration Data')
      getConfig()
      log.debug('Configuration Data', MAIN_CONFIG)
      log.audit('Step:', 'Init Process')
      log.audit('Step:', 'Get Token')
      const token = getLookerToken()
      if (token) {
        log.audit('Step:', 'Get Looker')
        const lookerInfo = getLookerInformation(token)
        log.audit('Step:', 'Get Data')
        log.debug({ title: 'lookerInfo', details: lookerInfo })
        const results = getQueryResults(lookerInfo.query_id, token)
        results.forEach(result => {
          data.push(result)
        })
      }
      log.audit('Total of results:', data.length)
      // TEST: block results
      const BLOCK_RESULTS = 2
      const blocksData = []
      for (let i = 0; i < data.length; i += BLOCK_RESULTS) {
        const block = data.slice(i, i + BLOCK_RESULTS)
        blocksData.push(block)
      }
      log.audit('getInputData ~ blocks_data:', blocksData.length)
      log.debug({ title: 'return', details: blocksData[0] })
      // return blocksData[0]
      // COMMENT: All data
      return data
    } catch (err) {
      log.error('Error on getInputData', err)
    }
  }

  /**
   * Defines the function that is executed when the map entry point is triggered. This entry point is triggered automatically
   * when the associated getInputData stage is complete. This function is applied to each key-value pair in the provided
   * context.
   * @param {Object} mapContext - Data collection containing the key-value pairs to process in the map stage. This parameter
   *     is provided automatically based on the results of the getInputData stage.
   * @param {Iterator} mapContext.errors - Serialized errors that were thrown during previous attempts to execute the map
   *     function on the current key-value pair
   * @param {number} mapContext.executionNo - Number of times the map function has been executed on the current key-value
   *     pair
   * @param {boolean} mapContext.isRestarted - Indicates whether the current invocation of this function is the first
   *     invocation (if true, the current invocation is not the first invocation and this function has been restarted)
   * @param {string} mapContext.key - Key to be processed during the map stage
   * @param {string} mapContext.value - Value to be processed during the map stage
   * @since 2015.2
   */

  const map = mapContext => {
    try {
      const { key } = mapContext
      let { value } = mapContext
      value = JSON.parse(value)
      if (Number(key) === 0) {
        log.audit('Step:', 'Mapping the data')
      }
      const line = {}
      Object.values(JSON_STRUCTURE).forEach(accessValue => {
        line[accessValue] = value[accessValue]
      })
      mapContext.write({ key, value: line })
    } catch (err) {
      log.error('Error on map', err)
    }
  }

  /**
   * Defines the function that is executed when the reduce entry point is triggered. This entry point is triggered
   * automatically when the associated map stage is complete. This function is applied to each group in the provided context.
   * @param {Object} reduceContext - Data collection containing the groups to process in the reduce stage. This parameter is
   *     provided automatically based on the results of the map stage.
   * @param {Iterator} reduceContext.errors - Serialized errors that were thrown during previous attempts to execute the
   *     reduce function on the current group
   * @param {number} reduceContext.executionNo - Number of times the reduce function has been executed on the current group
   * @param {boolean} reduceContext.isRestarted - Indicates whether the current invocation of this function is the first
   *     invocation (if true, the current invocation is not the first invocation and this function has been restarted)
   * @param {string} reduceContext.key - Key to be processed during the reduce stage
   * @param {List<String>} reduceContext.values - All values associated with a unique key that was passed to the reduce stage
   *     for processing
   * @since 2015.2
   */
  const reduce = reduceContext => {
    try {
      const { key, values } = reduceContext
      // const { WEINFUSE } = RECORDS
      values.forEach(value => {
        const resultObj = { success: false, type: '' }
        value = JSON.parse(value)
        const newStaging = createStagingRecord(value)
        log.debug({ title: 'newStaging', details: newStaging })
        if (!newStaging.recordId) {
          log.error({ title: 'Error creating the staging', details: { error: newStaging.error, data: value } })
          // COLOCAR STATUS
        } else if (newStaging.success === false) {
          const values = {}
          values[STAGING.FIELDS.STATUS] = newStaging.errorid
          const otherId = record.submitFields({
            type: STAGING.ID,
            id: newStaging.recordId,
            values
          })
          log.error({
            title: 'Error finding the staging ' + newStaging.recordId,
            details: { error: newStaging.error, data: value }
          })
        } else {
          resultObj.success = true
          resultObj.type = 'created'
        }
        reduceContext.write({
          key,
          value: resultObj
        })
      })
    } catch (err) {
      log.error('Error on reduce', err)
    }
  }

  /**
   * Defines the function that is executed when the summarize entry point is triggered. This entry point is triggered
   * automatically when the associated reduce stage is complete. This function is applied to the entire result set.
   * @param {Object} summaryContext - Statistics about the execution of a map/reduce script
   * @param {number} summaryContext.concurrency - Maximum concurrency number when executing parallel tasks for the map/reduce
   *     script
   * @param {Date} summaryContext.dateCreated - The date and time when the map/reduce script began running
   * @param {boolean} summaryContext.isRestarted - Indicates whether the current invocation of this function is the first
   *     invocation (if true, the current invocation is not the first invocation and this function has been restarted)
   * @param {Iterator} summaryContext.output - Serialized keys and values that were saved as output during the reduce stage
   * @param {number} summaryContext.seconds - Total seconds elapsed when running the map/reduce script
   * @param {number} summaryContext.usage - Total number of governance usage units consumed when running the map/reduce
   *     script
   * @param {number} summaryContext.yields - Total number of yields when running the map/reduce script
   * @param {Object} summaryContext.inputSummary - Statistics about the input stage
   * @param {Object} summaryContext.mapSummary - Statistics about the map stage
   * @param {Object} summaryContext.reduceSummary - Statistics about the reduce stage
   * @since 2015.2
   */
  const summarize = summaryContext => {
    try {
      log.audit('Status process', 'Process Complete')
      const { output } = summaryContext
      let counterCreated = 0
      const counterUpdated = 0
      let counterFails = 0
      output.iterator().each((key, value) => {
        const line = JSON.parse(value)
        if (line.success) {
          if (line.type === 'created') {
            counterCreated++
            //   } else if (line.type === 'updated') {
            // counterUpdated++
          }
        } else {
          counterFails++
        }
        return true
      })
      log.audit(
        'Results',
        `Staging resume, creates: ${counterCreated}, updates: ${counterUpdated}, fails: ${counterFails}`
      )
    } catch (err) {
      log.error('Error on summarize', err)
    }
  }

  /**
   * This function retrieves configuration data from a NetSuite record and stores it in an object.
   */
  const getConfig = () => {
    try {
      const { FIELDS } = RECORDS.CONFIG
      const objSearch = search.create({
        type: RECORDS.CONFIG.ID,
        filters: [[FIELDS.ISINACTIVE, search.Operator.IS, 'F']],
        columns: Object.values(FIELDS).map(x => {
          return { name: x }
        })
      })
      const results = objSearch.run().getRange({ start: 0, end: 1 })
      results.forEach(result => {
        Object.entries(FIELDS).forEach(([key, value]) => {
          MAIN_CONFIG[value] = result.getValue({ name: value })
        })
      })
      const companyInfo = config.load({ type: config.Type.COMPANY_PREFERENCES })
      MAIN_CONFIG.format_date = companyInfo.getValue({ fieldId: 'DATEFORMAT' })
    } catch (err) {
      log.error('Error on getConfig', err)
    }
  }

  /**
   * This function retrieves a Looker access token using a client ID and client secret.
   * @returns The function `getLookerToken` returns a string value representing the Looker access
   * token. If an error occurs during the process, the function logs an error message and returns an
   * empty string.
   */
  const getLookerToken = () => {
    const { CONFIG } = RECORDS
    let token = ''
    try {
      const headers = {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
      const response = https.post({
        url: MAIN_CONFIG[CONFIG.FIELDS.URL1],
        body: `client_id=${MAIN_CONFIG[CONFIG.FIELDS.CLIENT_ID]}&client_secret=${
          MAIN_CONFIG[CONFIG.FIELDS.CLIENT_SECRET]
        }`,
        headers
      })

      const body = JSON.parse(response.body) ?? {}
      token = body?.access_token
    } catch (err) {
      log.error('Error on getLookerToken', err)
    }
    return token
  }

  /**
   * This function retrieves Looker information using an access token and returns it as a JSON object.
   * @returns The function `getLookerInformation` returns the parsed JSON response obtained from a GET
   * request to a Looker API endpoint, using an access token passed as an argument. If an error occurs
   * during the execution of the function, it returns `false`.
   */
  const getLookerInformation = accessToken => {
    try {
      const { CONFIG } = RECORDS
      const headerObj = {
        Authorization: `Bearer ${accessToken}`
      }
      MAIN_CONFIG[CONFIG.FIELDS.URL2] = MAIN_CONFIG[CONFIG.FIELDS.URL2] + MAIN_CONFIG[CONFIG.FIELDS.REPORT2]
      const response = https.get({
        url: MAIN_CONFIG[CONFIG.FIELDS.URL2],
        headers: headerObj
      })
      return JSON.parse(response.body)
    } catch (err) {
      log.error({
        title: 'Error occurred in getLookerInformation',
        details: err
      })
      return false
    }
  }

  /**
   * The function `getQueryResults` retrieves query results using a query ID and access token, and
   * returns the results as a parsed JSON object or false if an error occurs.
   * @param queryId - The queryId parameter is a string that represents the unique identifier of a
   * query. It is used to retrieve the results of a specific query.
   * @param accessToken - The `accessToken` parameter is a string that represents the access token
   * required to authenticate the user making the API request. It is used to authorize the user and
   * grant access to the requested resources.
   * @returns The function `getQueryResults` returns the parsed JSON response from an HTTP GET request
   * made to a URL that includes a query ID and an access token in the headers. If an error occurs, it
   * returns `false`.
   */
  const getQueryResults = (queryId, accessToken) => {
    try {
      const { CONFIG } = RECORDS
      const urlReplace = MAIN_CONFIG[CONFIG.FIELDS.URL3].replace('{queryId}', queryId)
      const headerObj = {
        Authorization: `Bearer ${accessToken}`
      }
      const response = https.get({
        url: urlReplace,
        headers: headerObj
      })
      return JSON.parse(response.body)
    } catch (err) {
      log.error({
        title: 'Error occurred in getQueryResults',
        details: err
      })
      return false
    }
    // return [
    //   {
    //     'group.id': 561,
    //     'group.name': 'C397 Asthma & Allergy Center, LLC',
    //     'locations.id': 1100,
    //     'locations.name': 'C397H Bel Air',
    //     'orders_inventory.order_series_id': 336746,
    //     'orders_inventory.id': 486006,
    //     'appointments_inventory.id': 1758653,
    //     'appointments_inventory.status': 'Complete',
    //     'patients_inventory.id': 304804,
    //     'patients_inventory.identifier': 'IV304804',
    //     'inventory_items.ndc_code': '50242021501',
    //     'inventory_items.outer_ndc_code': '50242021501',
    //     'inventory_items.label_name': 'XOLAIR 150 MG/ML SYRINGE',
    //     'inventory_items.strength': 150,
    //     'inventory_items.uom': 'mg',
    //     'inventory_items.lot': '3564740',
    //     'inventory_items.expiration_date': '2024-06-30',
    //     'inventory_items.created_time': '2023-07-18 21:05:07',
    //     'inventory_items.inventory_item_id': 'BB4379953',
    //     'inventory_items.line_item_id': 5135888
    //   }
    // ]
  }

  /**
   * The function takes a date string in the format of MM/DD/YYYY and returns a moment object with the
   * locale set to English, or logs an error if there is one.
   * @returns The `formatDate` function is returning a Moment object, which represents a date and time
   * in JavaScript.
   */
  const formatDate = d => {
    try {
      getConfig()
      const newFormat = moment(d).format(MAIN_CONFIG.format_date)
      log.debug('formatDate ~ newFormat:', { d, newFormat, type: typeof newFormat })
      return new Date(newFormat)
    } catch (err) {
      log.error('Error on formatDate', err)
    }
  }

  const createStagingRecord = data => {
    const dateReturn = { success: false, error: '', recordId: '' }
    try {
      const { STAGING } = RECORDS
      const { FIELDS } = STAGING
      getConfig()
      log.debug({ title: 'dataStaging', details: data })
      const objRecord = record.create({ type: STAGING.ID, isDynamic: true })
      objRecord.setValue({
        fieldId: FIELDS.LINE_ID,
        value: data[JSON_STRUCTURE.ITEMS_LINE_ITEM_ID],
        ignoreFieldChange: false
      })
      const resultCustomer = getCustomer(data[JSON_STRUCTURE.GROUP_NAME])
      // log.debug({title:'resultCustomer', details:resultCustomer});
      if (resultCustomer.success === false || !resultCustomer.customerId) {
        dateReturn.success = false
        dateReturn.error = resultCustomer.error
        return dateReturn
      }
      objRecord.setValue({
        fieldId: FIELDS.CUSTOMER,
        value: resultCustomer.customerId,
        ignoreFieldChange: false
      })
      if (resultCustomer.category === MAIN_CONFIG[RECORDS.CONFIG.FIELDS.IS_CORE]) {
        // lineRecord[WEINFUSE.FIELDS.LOCATION] = MAIN_CONFIG[RECORDS.CONFIG.FIELDS.CORE_LOCATION]
        objRecord.setValue({
          fieldId: FIELDS.LOCATION,
          value: MAIN_CONFIG[RECORDS.CONFIG.FIELDS.CORE_LOCATION],
          ignoreFieldChange: false
        })
      } else {
        const resultLocation = getLocation(data[JSON_STRUCTURE.LOCATION_NAME])
        // log.debug({title:'resultLocation', details:resultLocation});
        if (resultLocation.success === false || !resultLocation.locationId) {
          dateReturn.success = false
          dateReturn.error = resultLocation.error
          return dateReturn
        }
        objRecord.setValue({
          fieldId: FIELDS.LOCATION,
          value: resultLocation.locationId,
          ignoreFieldChange: false
        })
      }
      const resultShipTo = getShipTo(data[JSON_STRUCTURE.LOCATION_NAME], resultCustomer.customerId)
      // log.debug({title:'resultShipTo', details:resultShipTo});
      if (resultShipTo.success === false || !resultShipTo.shipTo) {
        dateReturn.success = false
        dateReturn.error = resultShipTo.error
        return dateReturn
      }
      objRecord.setValue({
        fieldId: FIELDS.SHIP_TO,
        value: resultShipTo.shipTo,
        ignoreFieldChange: false
      })
      const resultItem = getItem(data[JSON_STRUCTURE.ITEMS_OUTER_NDC_CODE])
      // log.debug({title:'resultItem', details:resultItem});
      if (resultItem.success === false || !resultItem.item) {
        dateReturn.success = false
        dateReturn.error = resultItem.error
        return dateReturn
      }
      objRecord.setValue({
        fieldId: FIELDS.ITEM,
        value: resultItem.item,
        ignoreFieldChange: false
      })
      // TODO ITEM STARUS
      objRecord.setValue({
        fieldId: FIELDS.NDC,
        value: data[JSON_STRUCTURE.ITEMS_NDC_CODE],
        ignoreFieldChange: false
      })
      objRecord.setValue({
        fieldId: FIELDS.QUANTITY,
        value: data[JSON_STRUCTURE.ITEMS_STRENGTH],
        ignoreFieldChange: false
      })
      objRecord.setValue({
        fieldId: FIELDS.DATE,
        value: formatDate(data[JSON_STRUCTURE.ITEMS_CREATED_TIME]),
        ignoreFieldChange: false
      })

      objRecord.setValue({
        fieldId: FIELDS.EXPIRATION_DATE,
        value: formatDate(data[JSON_STRUCTURE.ITEMS_EXPIRATION_DATE]),
        ignoreFieldChange: false
      })
      objRecord.setValue({
        fieldId: FIELDS.LOT,
        value: data[JSON_STRUCTURE.ITEMS_LOT],
        ignoreFieldChange: false
      })
      objRecord.setValue({
        fieldId: FIELDS.PATIENT_ID,
        value: data[JSON_STRUCTURE.PATIENTS_INVENTORY_IDENTIFIER],
        ignoreFieldChange: false
      })
      objRecord.setValue({
        fieldId: FIELDS.GROUP_NAME,
        value: data[JSON_STRUCTURE.GROUP_NAME],
        ignoreFieldChange: false
      })
      objRecord.setValue({
        fieldId: FIELDS.LOCATION_NAME,
        value: data[JSON_STRUCTURE.LOCATION_NAME],
        ignoreFieldChange: false
      })

      objRecord.setValue({
        fieldId: FIELDS.SHIP_TO_NAME,
        value: data[JSON_STRUCTURE.LOCATION_NAME].length ? data[JSON_STRUCTURE.LOCATION_NAME].split(' ')[0] : '',
        ignoreFieldChange: false
      })
      objRecord.setValue({
        fieldId: FIELDS.ITEM_LABEL,
        value: data[JSON_STRUCTURE.ITEMS_LABEL_NAME],
        ignoreFieldChange: false
      })
      objRecord.setValue({
        fieldId: FIELDS.UOM,
        value: data[JSON_STRUCTURE.ITEMS_UOM],
        ignoreFieldChange: false
      })
      objRecord.setValue({
        fieldId: FIELDS.WE_INFUSE,
        value: data[JSON_STRUCTURE.WEINFUSE_UID],
        ignoreFieldChange: false
      })
      objRecord.setValue({
        fieldId: FIELDS.LINE,
        value: JSON.stringify(data),
        ignoreFieldChange: false
      })
      const recordId = objRecord.save()
      // return recordId
      dateReturn.recordId = recordId
      dateReturn.success = true
    } catch (err) {
      log.error('Error on createStagingRecord', err)
      dateReturn.success = false
      dateReturn.error = err
    }
    return dateReturn
  }

  const getCustomer = data => {
    const dateReturn = { success: false, error: '', customerId: '', category: '' }
    try {
      let nameCustomer = data.split(' ')
      nameCustomer = nameCustomer[0]
      // log.debug({title:'nameCustoemr', details:nameCustomer});
      const customerSearchObj = search.create({
        type: search.Type.CUSTOMER,
        filters: [['entityid', 'is', nameCustomer]],
        columns: [
          search.createColumn({
            name: 'entityid',
            sort: search.Sort.ASC,
            label: 'ID'
          }),
          search.createColumn({ name: 'category', label: 'Category' }),
          search.createColumn({ name: 'internalid', label: 'Internal ID' })
        ]
      })
      const customerresult = customerSearchObj.runPaged({
        pageSize: 1000
      })
      // log.debug("Customer count",customerresult.count);
      if (customerresult.count > 0) {
        if (customerresult.count === 1) {
          customerresult.pageRanges.forEach(function (pageRange) {
            const myPage = customerresult.fetch({ index: pageRange.index })
            myPage.data.forEach(function (result) {
              dateReturn.customerId = result.getValue({ name: 'internalid' })
              dateReturn.category = result.getValue({ name: 'category' })
              dateReturn.success = true
            })
          })
        } else {
          dateReturn.success = false
          dateReturn.error = 'More than one customer found'
          dateReturn.errorid = 11
        }
      } else {
        dateReturn.success = false
        dateReturn.error = 'Customer not found'
        dateReturn.errorid = 10
      }
    } catch (err) {
      log.error('Error on getCustomer', err)
      dateReturn.success = false
      dateReturn.error = err
      dateReturn.errorid = 9
    }
    return dateReturn
  }

  const getLocation = data => {
    const dateReturn = { success: false, error: '', locationId: '' }
    try {
      let nameLocation = data.split(' ')
      nameLocation = nameLocation[0]
      // log.debug({title:'nameLocation', details:nameLocation});
      const customerSearchObj = search.create({
        type: search.Type.LOCATION,
        filters: [['custrecord_tkidinternal', 'is', nameLocation]],
        columns: [
          search.createColumn({
            name: 'name',
            sort: search.Sort.ASC,
            label: 'Name'
          }),
          search.createColumn({ name: 'internalid', label: 'Internal ID' })
        ]
      })
      const customerresult = customerSearchObj.runPaged({
        pageSize: 1000
      })
      // log.debug("Customer count",customerresult.count);
      if (customerresult.count > 0) {
        if (customerresult.count === 1) {
          customerresult.pageRanges.forEach(function (pageRange) {
            const myPage = customerresult.fetch({ index: pageRange.index })
            myPage.data.forEach(function (result) {
              dateReturn.locationId = result.getValue({ name: 'internalid' })
              dateReturn.success = true
            })
          })
        } else {
          dateReturn.success = false
          dateReturn.error = 'More than one Location found'
          dateReturn.errorid = 8
        }
      } else {
        dateReturn.success = false
        dateReturn.error = 'Location not found'
        dateReturn.errorid = 7
      }
    } catch (err) {
      log.error('Error on getLocation', err)
      dateReturn.success = false
      dateReturn.error = err
      dateReturn.errorid = 9
    }
    return dateReturn
  }

  const getShipTo = (data, customerId) => {
    const response = { success: false, error: '', shipTo: '' }
    try {
      let nameLocation = data.split(' ')
      nameLocation = nameLocation[0]
      // log.debug({title:'nameLocation', details:nameLocation});
      const customerSearchObj = search.create({
        type: search.Type.CUSTOMER,
        filters: [['addresslabel', 'is', nameLocation], 'AND', ['internalid', search.Operator.IS, customerId]],
        columns: [
          search.createColumn({ name: 'internalid', label: 'Internal ID' }),
          search.createColumn({
            name: 'addressinternalid',
            label: 'Address Internal ID'
          }),
          search.createColumn({
            name: 'addresslabel',
            label: 'Address Label'
          })
        ]
      })
      const customerresult = customerSearchObj.runPaged({
        pageSize: 1000
      })
      // log.debug("Customer count",customerresult.count);
      if (customerresult.count > 0) {
        if (customerresult.count === 1) {
          customerresult.pageRanges.forEach(function (pageRange) {
            const myPage = customerresult.fetch({ index: pageRange.index })
            myPage.data.forEach(function (result) {
              response.shipTo = result.getValue({
                name: 'addressinternalid',
                label: 'Address Internal ID'
              })
              response.success = true
            })
          })
        } else {
          response.success = false
          response.error = 'More than one Ship To found'
          response.errorid = 13
        }
      } else {
        response.success = false
        response.error = 'Ship To not found'
        response.errorid = 12
      }
    } catch (err) {
      log.error('Error on getShipTo', err)
      response.success = false
      response.error = err
      response.errorid = 9
    }
    return response
  }

  const getItem = data => {
    const response = { success: false, error: '', item: '' }
    try {
      // log.debug({title:'data', details:data});
      const itemSearchObj = search.create({
        type: search.Type.ITEM,
        filters: [['name', 'is', data]],
        columns: [
          search.createColumn({
            name: 'itemid',
            sort: search.Sort.ASC,
            label: 'Name'
          }),
          search.createColumn({ name: 'displayname', label: 'Display Name' }),
          search.createColumn({ name: 'salesdescription', label: 'Description' }),
          search.createColumn({ name: 'type', label: 'Type' }),
          search.createColumn({ name: 'internalid', label: 'Internal ID' })
        ]
      })
      const itemResult = itemSearchObj.runPaged({
        pageSize: 1000
      })
      if (itemResult.count > 0) {
        if (itemResult.count === 1) {
          itemResult.pageRanges.forEach(function (pageRange) {
            const myPage = itemResult.fetch({ index: pageRange.index })
            myPage.data.forEach(function (result) {
              response.item = result.getValue({ name: 'internalid' })
              response.success = true
            })
          })
        } else {
          response.success = false
          response.error = 'More than one Item found'
          response.errorid = 6
        }
      } else {
        response.success = false
        response.error = 'Item To not found'
        response.errorid = 5
      }
    } catch (err) {
      log.error('Error on getItem', err)
      response.success = false
      response.error = err
      response.errorid = 9
    }
    return response
  }

  return { getInputData, map, reduce, summarize }
})
