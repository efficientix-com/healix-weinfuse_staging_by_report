/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */

// eslint-disable-next-line no-undef
define(['N/config', 'N/https', 'N/log', 'N/record', 'N/search', './FB - Const Lib Staging by report.js', './extras/moment.js'], /**
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
        log.debug({title:'lookerInfo', details:lookerInfo});
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
      log.debug({title:'return', details:blocksData[0]});
      return blocksData[0]
      // COMMENT: All data
      // return data
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
      const { WEINFUSE } = RECORDS
      values.forEach(value => {
        value = JSON.parse(value)
        var newStaging = createStagingRecord(value);
        log.debug({title:'newSatging', details:newStaging});
        if (newStaging.success == false || !newStaging.recordId) {
          log.error({title:'Error creating the staging', details:newStaging.error});
        }
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
      const counterCreated = 0
      let counterUpdated = 0
      const counterFails = 0
      output.iterator().each((key, value) => {
        // const line = JSON.parse(value)
        // if (line.status === 'success') {
        //   if (line.type === 'created') {
        //     counterCreated++
        //   } else if (line.type === 'updated') {
        counterUpdated++
        //   }
        // } else if (line.status === 'fail') {
        //   counterFails++
        // }
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
      MAIN_CONFIG[CONFIG.FIELDS.URL2] = MAIN_CONFIG[CONFIG.FIELDS.URL2] + MAIN_CONFIG[CONFIG.FIELDS.REPORT2];
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
      return [{'group.id':50,'group.name':"C029 Central Texas Neurology Consultants","locations.id":100,"locations.name":"C029 Central Texas Neurology Consultants","orders_inventory.order_series_id":255306,"orders_inventory.id":538187,"appointments_inventory.id":1413066,"appointments_inventory.status":"Complete","patients_inventory.id":74060,"patients_inventory.identifier":"IV74060","inventory_items.ndc_code":"00338004903","inventory_items.outer_ndc_code":"00338004903","inventory_items.label_name":"SODIUM CHLORIDE 0.9% SOLUTION","inventory_items.strength":500,"inventory_items.uom":"ml","inventory_items.lot":"Y418676","inventory_items.expiration_date":"2024-07-31","inventory_items.created_time":"2023-06-06 19:05:50","inventory_items.inventory_item_id":"BB4189564","inventory_items.line_item_id":4917042}]
      // return false
    }
  }

  /**
   * The function creates a new record in NetSuite's WEINFUSE record type with data provided in the
   * input parameter.
   * @returns The function `createWeInfuseRecord` returns the ID of the newly created record in
   * NetSuite.
   */
  const createWeInfuseRecord = data => {
    try {
      const { WEINFUSE } = RECORDS
      const { FIELDS } = WEINFUSE
      const objRecord = record.create({ type: WEINFUSE.ID, isDynamic: true })
      objRecord.setValue({
        fieldId: FIELDS.WE_INFUSE,
        value: data[JSON_STRUCTURE.PATIENTS_INVENTORY_ID],
        ignoreFieldChange: false
      })
      objRecord.setValue({
        fieldId: FIELDS.LINE_ID,
        value: data[JSON_STRUCTURE.ITEMS_LINE_ITEM_ID],
        ignoreFieldChange: false
      })
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
      // TODO: PARAM STATUS LIST
      objRecord.setValue({
        fieldId: FIELDS.STATUS,
        value: 1,
        ignoreFieldChange: false
      })
      // TODO: Search relationship to price
      objRecord.setValue({
        fieldId: FIELDS.PRICE,
        value: 0,
        ignoreFieldChange: false
      })
      // FIXME: Format dates
      objRecord.setValue({
        fieldId: FIELDS.DATE,
        value: formatDate(data[JSON_STRUCTURE.ITEMS_CREATED_TIME]),
        ignoreFieldChange: false
      })
      objRecord.setValue({
        fieldId: FIELDS.EXPIRATION,
        value: formatDate(data[JSON_STRUCTURE.ITEMS_EXPIRATION_DATE]),
        ignoreFieldChange: false
      })

      // COMMENT: Include the rest of data
      objRecord.setValue({ fieldId: FIELDS.OBJECT_LINE, value: JSON.stringify(data), ignoreFieldChange: false })
      objRecord.setValue({ fieldId: FIELDS.GROUP_ID, value: data[JSON_STRUCTURE.GROUP_ID], ignoreFieldChange: false })
      objRecord.setValue({
        fieldId: FIELDS.GROUP_NAME,
        value: data[JSON_STRUCTURE.GROUP_NAME],
        ignoreFieldChange: false
      })
      objRecord.setValue({
        fieldId: FIELDS.LOCATION_ID,
        value: data[JSON_STRUCTURE.LOCATION_ID],
        ignoreFieldChange: false
      })
      objRecord.setValue({
        fieldId: FIELDS.LOCATION_NAME,
        value: data[JSON_STRUCTURE.LOCATION_NAME],
        ignoreFieldChange: false
      })
      objRecord.setValue({
        fieldId: FIELDS.ORD_SER_ID,
        value: data[JSON_STRUCTURE.ORDER_SERIES_ID],
        ignoreFieldChange: false
      })
      objRecord.setValue({
        fieldId: FIELDS.ORD_INV_ID,
        value: data[JSON_STRUCTURE.ORDERS_INVENTORY_ID],
        ignoreFieldChange: false
      })
      objRecord.setValue({
        fieldId: FIELDS.APPOINTMENT_INV,
        value: data[JSON_STRUCTURE.APPOINTMENTS_INVENTORY_ID],
        ignoreFieldChange: false
      })
      objRecord.setValue({
        fieldId: FIELDS.PATIENTS_IDENT,
        value: data[JSON_STRUCTURE.PATIENTS_INVENTORY_IDENTIFIER],
        ignoreFieldChange: false
      })
      objRecord.setValue({
        fieldId: FIELDS.OUTER_NDC,
        value: data[JSON_STRUCTURE.ITEMS_OUTER_NDC_CODE],
        ignoreFieldChange: false
      })
      objRecord.setValue({
        fieldId: FIELDS.ITEM_LABEL,
        value: data[JSON_STRUCTURE.ITEMS_LABEL_NAME],
        ignoreFieldChange: false
      })
      objRecord.setValue({ fieldId: FIELDS.UOM, value: data[JSON_STRUCTURE.ITEMS_UOM], ignoreFieldChange: false })
      objRecord.setValue({ fieldId: FIELDS.LOT, value: data[JSON_STRUCTURE.ITEMS_LOT], ignoreFieldChange: false })
      objRecord.setValue({
        fieldId: FIELDS.INVENTORY_ITEM_ID,
        value: data[JSON_STRUCTURE.ITEMS_INVENTORY_ITEM_ID],
        ignoreFieldChange: false
      })

      const recordId = objRecord.save()
      return recordId
    } catch (err) {
      log.error('Error on createWeInfuseRecord', err)
    }
  }

  /**
   * The function updates a record in the WEINFUSE table with the given ID and values.
   * @param {string|number} id - The id parameter is the internal id of the record that needs to be updated in
   * NetSuite.
   * @param {object} values - The `values` parameter is an object that contains the field values to be updated
   * for a specific record in NetSuite. The keys of the object represent the field IDs and the values
   * represent the new values to be set for those fields.
   * @returns The function `updateWeInfuseRecord` returns the `recordId` of the updated record if
   * successful, or `null` if there was an error.
   */
  const updateWeInfuseRecord = (id, values) => {
    try {
      const { WEINFUSE } = RECORDS
      const recordId = record.submitFields({
        type: WEINFUSE.ID,
        id,
        values,
        options: {
          enablesourcing: true,
          ignoreMandatoryFields: true
        }
      })
      return recordId
    } catch (err) {
      log.error('Error on updateWeInfuseRecord', err)
      return null
    }
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

  /**
   * The function searches for locations in a NetSuite account based on a given label.
   * @param {string} label
   * @returns The function `searchLocation` returns an object with three properties: `count`, `err`,
   * and `body`. The `count` property is a number representing the number of search results found. The
   * `err` property is a boolean indicating whether an error occurred during the search. The `body`
   * property is an array of objects representing the search results, with each object containing the
   * internal ID and name
   */
  const searchLocation = label => {
    const response = { count: 0, err: false, body: [] }
    try {
      const { LOCATION } = RECORDS
      label = label.split(' ')
      const objSearch = search.create({
        type: search.Type.LOCATION,
        filters: [[LOCATION.FIELDS.NAME, search.Operator.IS, label[0]]],
        columns: Object.values(LOCATION.FIELDS).map(f => {
          return { name: f }
        })
      })
      const countResults = objSearch.runPaged().count
      if (countResults > 0) {
        response.count = countResults
        const results = objSearch.run().getRange({ start: 0, end: 10 })
        response.body = results.map(result => {
          return {
            [LOCATION.FIELDS.INTERNALID]: result.getValue({ name: LOCATION.FIELDS.INTERNALID }),
            [LOCATION.FIELDS.NAME]: result.getValue({ name: LOCATION.FIELDS.NAME }),
            [LOCATION.FIELDS.ISINACTIVE]: result.getValue({ name: LOCATION.FIELDS.ISINACTIVE })
          }
        })
      }
    } catch (err) {
      log.error('Error on searchLocation', err)
      response.err = true
    }
    return response
  }

  const createStagingRecord = data => {
    var dateReturn = {success: false, error: '', recordId: ''};
    try {
      const { STAGING } = RECORDS
      const { FIELDS } = STAGING
      log.debug({title:'dataStaging', details:data});
      const objRecord = record.create({ type: STAGING.ID, isDynamic: true })
      objRecord.setValue({
        fieldId: FIELDS.LINE_ID,
        value: data[JSON_STRUCTURE.ITEMS_LINE_ITEM_ID],
        ignoreFieldChange: false
      })
      var resultCustomer = getCustomer(data[JSON_STRUCTURE.GROUP_NAME]);
      // log.debug({title:'resultCustomer', details:resultCustomer});
      if (resultCustomer.success == false || !resultCustomer.customerId ) {
        dateReturn.success = false;
        dateReturn.error = resultCustomer.error;
        return dateReturn;
      }
      objRecord.setValue({
        fieldId: FIELDS.CUSTOMER,
        value: resultCustomer.customerId,
        ignoreFieldChange: false
      })
      var resultLocation = getLocation(data[JSON_STRUCTURE.LOCATION_NAME]);
      // log.debug({title:'resultLocation', details:resultLocation});
      if (resultLocation.success == false || !resultLocation.locationId) {
        dateReturn.success = false;
        dateReturn.error = resultLocation.error
        return dateReturn
      }
      objRecord.setValue({
        fieldId: FIELDS.LOCATION,
        value: resultLocation.locationId,
        ignoreFieldChange: false
      })
      var resultShipTo = getShipTo(data[JSON_STRUCTURE.LOCATION_NAME]);
      // log.debug({title:'resultShipTo', details:resultShipTo});
      if (resultShipTo.success == false || !resultShipTo.shipTo) {
        dateReturn.success = false;
        dateReturn.error = resultShipTo.error
        return dateReturn
      }
      objRecord.setValue({
        fieldId: FIELDS.SHIP_TO,
        value: resultShipTo.shipTo,
        ignoreFieldChange: false
      })
      var resultItem = getItem(data[JSON_STRUCTURE.ITEMS_OUTER_NDC_CODE]);
      // log.debug({title:'resultItem', details:resultItem});
      if (resultItem.success == false || !resultItem.item) {
        dateReturn.success = false;
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
        fieldId: FIELDS.LOT,
        value: data[JSON_STRUCTURE.ITEMS_LOT],
        ignoreFieldChange: false
      })
      const recordId = objRecord.save()
      // return recordId
      dateReturn.recordId = recordId;
      dateReturn.success = true;
    } catch (err) {
      log.error('Error on createStagingRecord', err)
      dateReturn.success = false;
      dateReturn.error = err;
    }
    return dateReturn;
  }

  const getCustomer = data => {
    var dateReturn = {success: false, error: '', customerId: ''};
    try {
      var nameCustomer = data.split(' ');
      nameCustomer = nameCustomer[0];
      // log.debug({title:'nameCustoemr', details:nameCustomer});
      var customerSearchObj = search.create({
        type: search.Type.CUSTOMER,
        filters:
        [
           ["entityid","is",nameCustomer]
        ],
        columns:
        [
           search.createColumn({
              name: "entityid",
              sort: search.Sort.ASC,
              label: "ID"
           }),
           search.createColumn({name: "altname", label: "Name"}),
           search.createColumn({name: "internalid", label: "Internal ID"})
        ]
     });
    var customerresult = customerSearchObj.runPaged({
      pageSize: 1000
    });
    // log.debug("Customer count",customerresult.count);
    if (customerresult.count > 0) {
      if (customerresult.count == 1) {
        customerresult.pageRanges.forEach(function(pageRange){
          var myPage = customerresult.fetch({index: pageRange.index});
          myPage.data.forEach(function(result){
            dateReturn.customerId = result.getValue({name: 'internalid'});
            dateReturn.success =  true;
          });
        });
      }else{
        dateReturn.success = false;
        dateReturn.error = 'More than one customer found';
      }
    }else{
      dateReturn.success = false;
      dateReturn.error = 'Customer not found';
    }
    } catch (err) {
      log.error('Error on getCustomer', err)
      dateReturn.success = false;
      dateReturn.error = err;
    }
    return dateReturn;
  }

  const getLocation = data => {
    var dateReturn = {success: false, error: '', locationId: ''};
    try {
      var nameLocation = data.split(' ');
      nameLocation = nameLocation[0];
      // log.debug({title:'nameLocation', details:nameLocation});
      var customerSearchObj = search.create({
        type: search.Type.LOCATION,
        filters:
        [
           ["custrecord_tkidinternal","is",nameLocation]
        ],
        columns:
        [
          search.createColumn({
            name: "name",
            sort: search.Sort.ASC,
            label: "Name"
         }),
         search.createColumn({name: "internalid", label: "Internal ID"})
        ]
     });
    var customerresult = customerSearchObj.runPaged({
      pageSize: 1000
    });
    // log.debug("Customer count",customerresult.count);
    if (customerresult.count > 0) {
      if (customerresult.count == 1) {
        customerresult.pageRanges.forEach(function(pageRange){
          var myPage = customerresult.fetch({index: pageRange.index});
          myPage.data.forEach(function(result){
            dateReturn.locationId = result.getValue({name: 'internalid'});
            dateReturn.success =  true;
          });
        });
      }else{
        dateReturn.success = false;
        dateReturn.error = 'More than one Location found';
      }
    }else{
      dateReturn.success = false;
      dateReturn.error = 'Location not found';
    }
    } catch (err) {
      log.error('Error on getLocation', err)
      dateReturn.success = false;
      dateReturn.error = err;
    }
    return dateReturn;
  }

  const getShipTo = data => {
    var response = {success: false, error: '', shipTo: ''};
    try {
      var nameLocation = data.split(' ');
      nameLocation = nameLocation[0];
      // log.debug({title:'nameLocation', details:nameLocation});
      var customerSearchObj = search.create({
        type: search.Type.CUSTOMER,
        filters:
        [
           ["addresslabel","is",nameLocation]
        ],
        columns:
        [
          search.createColumn({
            name: "entityid",
            sort: search.Sort.ASC,
            label: "ID"
         }),
         search.createColumn({name: "altname", label: "Name"}),
         search.createColumn({name: "internalid", label: "Internal ID"}),
         search.createColumn({
          name: "addressinternalid",
          join: "Address",
          label: "Address Internal ID"
          }),
          search.createColumn({
              name: "addresslabel",
              join: "Address",
              label: "Address Label"
          })
        ]
      });
      var customerresult = customerSearchObj.runPaged({
        pageSize: 1000
      });
      // log.debug("Customer count",customerresult.count);
      if (customerresult.count > 0) {
        if (customerresult.count == 1) {
          customerresult.pageRanges.forEach(function(pageRange){
            var myPage = customerresult.fetch({index: pageRange.index});
            myPage.data.forEach(function(result){
              response.shipTo = result.getValue({
                name: "addressinternalid",
                join: "Address",
                label: "Address Internal ID"
              });
              response.success =  true;
            });
          });
        }else{
          response.success = false;
          response.error = 'More than one Ship To found';
        }
      }else{
        response.success = false;
        response.error = 'Ship To not found';
      }
    } catch (err) {
      log.error('Error on getShipTo', err)
      response.success = false;
      response.error = err;
    }
    return response;
  }

  const getItem = data => {
    var response = {success: false, error: '', item: ''};
    try {
      // log.debug({title:'data', details:data});
      var itemSearchObj = search.create({
        type: search.Type.ITEM,
        filters:
        [
           ["name","is",data]
        ],
        columns:
        [
          search.createColumn({
            name: "itemid",
            sort: search.Sort.ASC,
            label: "Name"
         }),
         search.createColumn({name: "displayname", label: "Display Name"}),
         search.createColumn({name: "salesdescription", label: "Description"}),
         search.createColumn({name: "type", label: "Type"}),
         search.createColumn({name: "internalid", label: "Internal ID"})
        ]
      });
      var itemResult = itemSearchObj.runPaged({
        pageSize: 1000
      });
      // log.debug("Item count",itemResult.count);
      if (itemResult.count > 0) {
        if (itemResult.count == 1) {
          itemResult.pageRanges.forEach(function(pageRange){
            var myPage = itemResult.fetch({index: pageRange.index});
            myPage.data.forEach(function(result){
              response.item = result.getValue({name: "internalid"});
              response.success =  true;
            });
          });
        }else{
          response.success = false;
          response.error = 'More than one Item found';
        }
      }else{
        response.success = false;
        response.error = 'Item To not found';
      }
    } catch (err) {
      log.error('Error on getItem', err)
      response.success = false;
      response.error = err;
    }
    return response;
  }

  return { getInputData, map, reduce, summarize }
})
