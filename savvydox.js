#!/usr/local/bin/node

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
	
	request.post(module.exports.host + "2/login", {
		'auth': { 'user': login, 'pass': password, 'sendImmediately': true } }, function(error, response, body) {
		if (error || response.statusCode >= 400) {
			if (errorHandler) {
				errorHandler(error);
			}
			return;
		}

		savvydox.user = JSON.parse(body);
		
		completionHandler(JSON.parse(body));
	});
};

module.exports.postDocument = function(document, contentPath, sourcePath, completionHandler, errorHandler) {
	var originaldocid = document.data.public.workingCopy.originalDocument;

	var origdocurl = savvydox.sdurl("/documents/" + originaldocid);
	request(origdocurl, function(error, response, body) {
		if (error) {
			console.log("Fetching original document failed: ");
			console.log(error);
			process.exit(1);
		}

		var origdoc = JSON.parse(body);

		var newTitle = document.data.public.workingCopy.releaseTitle;
		if (newTitle) {
			origdoc.title = newTitle;
		}

		// Update original document properties

		var formData = {
			document: JSON.stringify(origdoc), 
			content: {
				value: 	fs.createReadStream(contentPath), 
				options: {
					filename: 'content.pdf',
					contentType: 'application/pdf'
				}
			}
		};

		if (sourcePath) {
			formData.source = {
				value: 	fs.createReadStream(sourcePath), 
				options: {
					filename: document.sourceFileName,
					contentType: document.source.contentType
				}
			};
		}

		request.post({url: savvydox.sdurl("/documents/" + origdoc.id), formData: formData}, function(error, response, body) {
			if (error) {
				if (errorHandler) {
					errorHandler(error);
				}
				return;
			}
	
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

			var srcdest = path.name + "/" + srcfn;
			var srcfile = fs.createWriteStream(srcdest)
			var srcreq = request(srcurl).pipe(srcfile);
			srcfile.on('finish', function() {
				completionHandler(contentpath, srcdest);
			});
		} else {
			console.log("Working copy has no source");
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
	
module.exports.getEvent = function(context, eventid, completionHandler, errorHandler) {
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
	
module.exports.getDocument = function(context, documentid, completionHandler, errorHandler) {
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
	var recipurl = savvydox.sdurl("/documents/" + event.payload.document + "/recipients");
	recipurl += "&format=decompose";
	request(recipurl, function(error, response, body) {
		if (error || response.statusCode >= 400) {
			if (errorHandler) {
				errorHandler(error);
			}
			return;
		}
	
		var recipients = JSON.parse(body);
		return recipients;
	});
};
			
module.exports.getDocumentTasks = function(documentid, completionHandler, errorHandler) {
	var tasksurl = savvydox.sdurl("/usertasks/document/" + event.payload.document);
	tasksurl += "&format=decompose";
	console.log("Requesting tasks: " + tasksurl);

	request(tasksurl, function(error, response, body) {
		if (error || response.statusCode >= 400) {
			if (errorHandler) {
				errorHandler(error);
			}
			return;
		}

		var tasks = JSON.parse(body);
		return tasks;
	});
}
