'use strict';
/*
 * @list dependencies
 */

var async = require('async');

/*
 * @method paginate
 * @param {Object} query Mongoose Query Object
 * @param {Object} pagination options
 * Extend Mongoose Models to paginate queries
 */

function paginate(q, options, callback) {
  /*jshint validthis:true */
  var query, skipFrom, sortBy, columns, populate, countType, maxCount, maxLimit, model = this;
  columns = options.columns || null;
  sortBy = options.sortBy || null;
  populate = options.populate || null;
  countType = options.countType;
  maxCount = options.maxCount || 10000;
  maxLimit = options.maxLimit || 50000;
  callback = callback || function() {};
  var lean = options.lean || null;
  var pageNumber = options.page || 1;
  var resultsPerPage = options.limit || 10;
  skipFrom = (pageNumber * resultsPerPage) - resultsPerPage;
  query = model.find(q);
  if (columns !== null) {
    query.select(options.columns);
  }
  query.skip(skipFrom).limit(resultsPerPage);
  if (sortBy !== null) {
    query.sort(sortBy);
  }
  if (populate) {
    if (Array.isArray(populate)) {
      populate.forEach(function(field) {
        query.populate(field);
      });
    } else {
      query.populate(populate);
    }
  }
  if (lean) {
    query.lean();
  }
  async.parallel({
    results: function(callback) {
      query.exec(callback);
    },
    count: function(callback) {
      if(countType == "hidden") {
        callback(null, 0)
      } else {
        if(countType =="limited") {
          model.aggregate([
            {$match: q},
            { $limit : maxCount },
            {$count: "count"}
          ], function(err, result) {
            var count = 0
            if (result && result[0]) { count = result[0].count }
            if (count >=maxLimit) {
              count = (maxLimit -1)  + "+";
              callback(err, count);
              return;
            }
            if(count >= maxCount) {
              count = (count - 1) + "+"
            }
            callback(err, count);
          })
        } else {
          model.aggregate([
            {$match: q},
            {$count: "count"}
          ], function(err, result) {
            var count = 0
            if (result && result[0]) { count = result[0].count }
            callback(err, count);
         });
        }
      }
    }
  }, function(error, data) {
    if (error) {
      return callback(error);
    }
    callback(null, data.results, Math.ceil(data.count / resultsPerPage) || 1, data.count);
  });
}

module.exports = function(schema) {
  schema.statics.paginate = paginate;
};
