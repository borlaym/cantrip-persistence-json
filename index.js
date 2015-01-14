var fs = require("fs");
_ = require("lodash");

/**
 * The actual data is stored here
 * @type {Object}
 * @private
 */
var data = {};

var options;

function syncData() {
	fs.writeFile(options.namespace, JSON.stringify(data, null, "\t"), function(err) {
		if (err) {
			console.log(err);
		}
	});
}


module.exports = {
	initialize: function(callback) {
		//Set up memory by reading the contents of the file
		if (!fs.existsSync(this.options.namespace)) {
			fs.writeFileSync(this.options.namespace, "{\"_contents\": {}}");
		}

		data = JSON.parse(fs.readFileSync(this.options.namespace, {
			encoding: 'utf-8'
		}));

		options = this.options;

		callback && callback();
	},
	dataStore: {
		get: function(path, callback) {
			path = _.filter(path.split("/"), function(string) {
				return string !== "";
			});
			var node = data;
			//Loop through the data by the given paths
			for (var i = 0; i < path.length; i++) {
				var temp = node[path[i]];
				//If we found the given key, assign the node object to its value
				if (temp !== undefined) {
					node = node[path[i]];
					//If the given key doesn't exist, try the _id
				} else {
					temp = _.find(node, function(obj) {
						return obj._id === path[i];
					});
					//If it's not undefined, then assign it as the value
					if (temp !== undefined) {
						node = temp;
					} else {
						callback({
							status: 404,
							error: "Requested node doesn't exist."
						}, null);
						return;
					}
				}
			}

			callback(null, node);
		},
		set: function(path, data, callback) {
			var self = this;
			this.get(path, function(err, target) {
				if (_.isArray(target)) {
					target.push(data);
					callback();
					syncData();
				} else if (_.isObject(target)) {
					target = _.extend(target, data);
					callback();
					syncData();
				} else {
					self.parent(path, function(err, parent) {
						parent[_.last(path.split("/"))] = data;
						callback();
						syncData();
					});
				}
			});
		},
		delete: function(path, callback) {
			var index = _.last(path.split("/"));
			this.parent(path, function(err, parent) {
				if (_.isArray(parent)) {
					if (_.isNumber(Number(index)) && !_.isNaN(Number(index))) {
						parent.splice(index, 1);
						//If it's a hash (string), we find the target object, get it's index and remove it from the array that way
					} else {
						var obj = _.find(parent, function(obj) {
							return obj._id === index;
						});
						parent.splice(_.indexOf(parent, obj), 1);
					}
				} else if (_.isObject(parent)) {
					delete parent[index];
				}
				callback();
				syncData();
			});
		},
		parent: function(path, callback) {
			this.get(path.split("/").slice(0, -1).join("/"), function(err, parent) {
				callback(err, parent);
			});
		}
	}
}