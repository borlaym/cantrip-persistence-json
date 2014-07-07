var fs = require("fs");
_ = require("lodash");

module.exports = {
	setupPersistence: function(callback) {
		//Set up memory by reading the contents of the file
		if (!fs.existsSync("data/" + this.options.namespace + ".json")) {
			fs.writeFileSync("data/" + this.options.namespace + ".json", "{}");
		}

		this.data = fs.readFileSync("data/" + this.options.namespace + ".json", {
			encoding: 'utf-8'
		});

		this.data = JSON.parse(this.data);

		callback();
	},
	dataStore: {
		get: function(path, callback) {
			path = _.filter(path.split("/"), function(string) {
				return string !== "";
			});
			//Get the root element based on several factors: whether we have _contents in the JSON, did we try to access something inside a _meta parameter
			//By default the root is the whole JSON
			var node = this.data;
			//If we're trying to access a meta object
			if (path.length > 0 && path[0][0] === "_" && path[0] !== "_meta") {
				//Set the root object to that meta object, or throw an error if it doesn't exist
				if (this.data[path[0]] !== undefined) {
					node = this.data[path[0]];
					var metaObject = path.shift();
				} else {
					callback({
						status: 404,
						error: "Requested meta object doesn't exist."
					}, null);
					return;
				}
				//If the first member of the url is "_meta", set the node root to this.data
			} else if (path[0] === "_meta") {
				node = this.data;
				var metaObject = path.shift();
				//If the first member of the url is not a meta object key, then check if we have _contents
			} else if (this.data._contents) {
				node = this.data._contents;
			}

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