#!/usr/local/bin/node

/**
 *  Simple library for accessing SavvyDox's REST web service.
 */

var request = require('request');
var fs = require('fs');
var os = require('os');
var guid = require('guid');

module.exports = {};

module.exports.sdurl = function(path) {
	var url = module.exports.host + "2" + path + "?accessToken=" + module.exports.user.accessToken;
	return url;
};

var savvydox = module.exports;

module.exports.login = function(host, login, password, completionHandler, errorHandler) {
	savvydox.host = host;
	
	request.post(module.exports.host + "2/login?clientApiVersion=2", {
		'auth': { 'user': login, 'pass': password, 'sendImmediately': true } }, function(error, response, body) {
		if (error || response.statusCode >= 400) {
			if (errorHandler) {
				if (!error) {
					error = "Response: " + response.statusCode;
				}
				errorHandler(error);
			}
			return;
		}

		savvydox.user = JSON.parse(body);
		
		completionHandler(JSON.parse(body));
	});
};

module.exports.register = function(host, login, password, email, completionHandler, errorHandler) {
	savvydox.host = host;
	
	var formData = {
		'user': JSON.stringify({ 'loginName': login, 'password': password, 'primaryEmail':email })
	};

	request.post({ 'url': module.exports.host + "2/registeruser?clientApiVersion=2", 
		formData: formData, },
		function(error, response, body) {
		if (error || response.statusCode >= 400) {
			if (errorHandler) {
				if (!error) {
					error = "Response: " + response.statusCode;
				}
				errorHandler(error);
			}
			return;
		}

		savvydox.user = JSON.parse(body);
		
		completionHandler(JSON.parse(body));
	});
};

module.exports.getServerInfo = function(completionHandler, errorHandler, detailLevel) {
	var url = module.exports.host + "2/serverinfo";
	if (detailLevel) {
		url += "?details=" + detailLevel;
	}

	request.get(url, function(error, response, body) {
		if (error) {
			errorHandler(error);
			return;
		}
		
		completionHandler(JSON.parse(body));	
	});
};

module.exports.postDocument = function(document, contentPath, sourcePath, completionHandler, errorHandler) {
	var docurl = savvydox.sdurl("/documents/" + document.id);
	request(docurl, function(error, response, body) {
		var formData = {
			document: JSON.stringify(document), 
		};

		if (contentPath) {
			formData.content = {
				value: 	fs.createReadStream(contentPath), 
				options: {
					filename: 'content.pdf',
					contentType: 'application/pdf'
				}
			};
		}
		
		if (sourcePath) {
			formData.source = {
				value: 	fs.createReadStream(sourcePath), 
				options: {
					filename: document.sourceFileName,
					contentType: document.source.contentType
				}
			};
		}

		request.post({url: docurl, formData: formData}, function(error, response, body) {
			if (error) {
				if (errorHandler) {
					errorHandler(error);
				}
				return;
			}
	
			var newdoc = JSON.parse(body);
			completionHandler(newdoc);
		});
	});
};

// To attach source, pass in sourceInfo that has path, fileName, and contentType properties
module.exports.postNewDocument = function(document, contentPath, sourceInfo, completionHandler, errorHandler) {	
	var formData = {
		document: JSON.stringify(document), 
		content: {
			value: 	fs.createReadStream(contentPath), 
			options: {
				filename: 'content.pdf',
				contentType: 'application/pdf'
			}
		}
	};

	if (sourceInfo) {
		formData.source = {
			value: 	fs.createReadStream(source.path), 
			options: {
				filename: source.fileName,
				contentType: source.contentType
			}
		};
	}

	request.post({url: savvydox.sdurl("/documents"), formData: formData}, function(error, response, body) {
		if (error) {
			errorHandler(error);
			return;
		}

		newdoc = JSON.parse(body);
		completionHandler(newdoc);
	});
};
	
module.exports.downloadDocumentContent = function(document, path, completionHandler, errorHandler) {
	var contenturl = savvydox.sdurl("/documents/" + document.id + "/content");
	var contentpath = path + "/content.pdf";
	var file = fs.createWriteStream(contentpath)
	var req = request(contenturl).pipe(file);
	file.on('finish', function() {
		// If the document has source associated with it, we need to download that
		if (document.hasOwnProperty("source")) {
			// Download source
			var srcurl = savvydox.sdurl("/documents/" + document.id + "/source");

			var srcfn = "content.docx";
			if (document.sourceFileName && document.sourceFileName.endsWith(".docx")) {
				srcfn = document.sourceFileName;
			}

			var srcdest = path + "/" + srcfn;
			var srcfile = fs.createWriteStream(srcdest)
			var srcreq = request(srcurl).pipe(srcfile);
			srcfile.on('finish', function() {
				completionHandler(contentpath, srcdest);
			});
		} else {
			completionHandler(contentpath);
		}
	});
};
	
module.exports.getUser = function(userid, completionHandler, errorHandler) {
	var meurl = savvydox.sdurl("/users/" + userid);

	// Part one - gather information including the user, event, and document that we're working with
	request(meurl, function(error, response, body) {
		if (error || response.statusCode >= 400) {
			if (errorHandler) {
				errorHandler(error);
			}
			return;
		}

		var user = JSON.parse(body);
		completionHandler(user);
	});
};
	
module.exports.getEvent = function(eventid, completionHandler, errorHandler) {
	request(eventurl, function(error, response, body) {
		if (error || response.statusCode >= 400) {
			if (errorHandler) {
				errorHandler(error);
			}
			return;
		}

		var events = JSON.parse(body);
		var event = events.events[0];
		completionHandler(event);
	});
};
	
module.exports.getDocument = function(documentid, completionHandler, errorHandler) {
	var docurl = savvydox.sdurl("/documents/" + documentid);
	request(docurl, function(error, response, body) {
		if (error || response.statusCode >= 400) {
			if (errorHandler) {
				errorHandler(error);
			}
			return;
		}
		
		var document = JSON.parse(body);
		completionHandler(document);
	});
};

module.exports.getCollections = function(completionHandler, errorHandler) {
	request(savvydox.sdurl("/collections"), function(error, response, body) {
		if (error || response.statusCode >= 400) {
			if (errorHandler) {
				errorHandler(error);
			}
			return;
		}
	
		var collections = JSON.parse(body);
		completionHandler(collections);
	});
};
			
module.exports.getDocumentRecipients = function(documentid, completionHandler, errorHandler) {
	var recipurl = savvydox.sdurl("/documents/" + documentid + "/recipients");
	recipurl += "&format=decompose";
	request(recipurl, function(error, response, body) {
		if (error || response.statusCode >= 400) {
			if (errorHandler) {
				errorHandler(error);
			}
			return;
		}
	
		var response = JSON.parse(body);
		completionHandler(response);
	});
};
			
module.exports.getDocumentTasks = function(documentid, completionHandler, errorHandler) {
	var tasksurl = savvydox.sdurl("/usertasks/document/" + event.payload.document);
	tasksurl += "&format=decompose";

	request(tasksurl, function(error, response, body) {
		if (error || response.statusCode >= 400) {
			if (errorHandler) {
				errorHandler(error);
			}
			return;
		}

		completionHandler(tasks);
	});
}

	
module.exports.getMyGroups = function(completionHandler, errorHandler) {
	var groupsurl = savvydox.sdurl("/groups");

	request(groupsurl, function(error, response, body) {
		if (error || response.statusCode >= 400) {
			if (errorHandler) {
				errorHandler(error);
			}
			return;
		}

		var groups = JSON.parse(body);
		completionHandler(groups);
	});
}

module.exports.postGroup = function(group, completionHandler, errorHandler) {
	var groupsurl = savvydox.sdurl("/groups");

	var formData = {
		'group': JSON.stringify(group)
	};

	request.post({url: groupsurl, formData: formData}, function(error, response, body) {
		if (error || response.statusCode >= 400) {
			if (errorHandler) {
				errorHandler(error);
			}
			return;
		}

		var group = JSON.parse(body);
		completionHandler(group);
	});
}

module.exports.putGroup = function(group, completionHandler, errorHandler) {
	var groupsurl = savvydox.sdurl("/groups/" + group.id);

	var formData = {
		'group': JSON.stringify(group)
	};

	request.put({url: groupsurl, formData: formData}, function(error, response, body) {
		if (error || response.statusCode >= 400) {
			if (errorHandler) {
				errorHandler(response);
			}
			return;
		}

		var group = JSON.parse(body);
		completionHandler(group);
	});
}

