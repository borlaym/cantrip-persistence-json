var fs = require("fs");
_ = require("lodash");

var counter = 0;
var options = null

module.exports = {
	setupPersistence: function(callback) {
		options = this.options;
		//Set up memory by reading the contents of the file
		if (!fs.existsSync("data/" + this.options.namespace + ".json")) {
			fs.writeFileSync("data/" + this.options.namespace + ".json", "{\"_contents\": {}}");
		}

		this.data = fs.readFileSync("data/" + this.options.namespace + ".json", {
			encoding: 'utf-8'
		});

		this.data = JSON.parse(this.data);

		callback();
	},
	syncData: function(req, res, next) {
		if (++counter === options.saveEvery && options.saveEvery !== 0) {
			fs.writeFile("data/" + options.namespace + ".json", JSON.stringify(req.data), function(err) {
				if (err) {
					console.log(err);
				}
			});
			counter = 0;
		}

	},
	dataStore: {
		get: function(path, callback) {
			path = _.filter(path.split("/"), function(string) {
				return string !== "";
			});
			var node = this.data;

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
			this.get(path, function(err, target) {
				if (_.isArray(target)) {
					target.push(data);
				} else if (_.isObject(target)) {
					target = _.extend(target, data);
				} else {
					target = data;
				}
				callback();
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
			});
		},
		parent: function(path, callback) {
			this.get(path.split("/").slice(0, -1).join("/"), function(err, parent) {
				callback(err, parent);
			});
		}
	}
}