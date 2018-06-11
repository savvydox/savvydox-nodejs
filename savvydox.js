#!/usr/local/bin/node

/**
 *  Simple library for accessing SavvyDox's REST web service.
 */

var request = require('request');
var rp = require('request-promise-native');
var FormData = require('form-data');
var fs = require('fs');
var os = require('os');
var guid = require('guid');

module.exports = {};

module.exports.sdurl = function(path) {
	var url = module.exports.host + "2" + path + "?accessToken=" + module.exports.user.accessToken;
	return url;
};

var savvydox = module.exports;

module.exports.login = async function(host, login, password, errorfunc) {
	savvydox.host = host;

	const options = {
		method: 'POST',
		uri: module.exports.host + '2/login?clientApiVersion=2',
		'auth': { 
			'user': login, 
			'pass': password, 
			'sendImmediately': true
		}
	};

	return rp(options)
		.then(function(body) {
			savvydox.user = JSON.parse(body);
			return savvydox.user;
		})
		.catch(function(err) {
			if (errorfunc) {
				errorfunc(err);
			}
			return undefined;
		});
};

module.exports.register = async function(host, login, password, email, errorfunc) {
	savvydox.host = host;
	
	var formData = {
		'user': JSON.stringify({ 'loginName': login, 'password': password, 'primaryEmail':email })
	};

	const options = {
		method: 'POST',
		uri: module.exports.host + '2/registeruser?clientApiVersion=2',
		formData: formData
	};

	return rp(options)
		.then(function(body) {
			savvydox.user = JSON.parse(body);
			return savvydox.user;
		})
		.catch(function(err) {
			if (errorfunc) {
				errorfunc(err);
			}
			return undefined;
		});
};

module.exports.getServerInfo = async function(errorfunc, detailLevel) {
	var url = module.exports.host + "2/serverinfo";
	if (detailLevel) {
		url += "?details=" + detailLevel;
	}

	const options = {
		method: 'GET',
		uri: url
	};

	return rp(options)
		.then(function(body) {
			return JSON.parse(body);
		})
		.catch(function(err) {
			if (errorfunc) {
				errorfunc(err);
			}
			return undefined;
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
module.exports.postNewDocument = async function(document, contentPath, sourceInfo, errorfunc) {	
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
	const options = {
		method: 'POST',
		uri: savvydox.sdurl("/documents"),
		formData: formData
	}

	return rp(options)
		.then(function(body) {
			return JSON.parse(body);
		})
		.catch(function(err) {
			if (errorfunc) {
				errorfunc(err);
			}
			return undefined;
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
	
module.exports.getUser = function(userid, errorfunc) {
	const options = {
		method: 'GET',
		uri: savvydox.sdurl("/users/" + userid)
	};

	return rp(options)
		.then(function(body) {
			return JSON.parse(body);
		})
		.catch(function(err) {
			if (errorfunc) {
				errorfunc(err);
			}
			return undefined;
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
			
module.exports.getCollectionRecipients = function(collectionid, completionHandler, errorHandler) {
	var recipurl = savvydox.sdurl("/collections/" + collectionid + "/recipients");
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
};

	
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
};

module.exports.getGroup = function(groupid, completionHandler, errorHandler) {
	var groupsurl = savvydox.sdurl("/groups/" + groupid);

	request(groupsurl, function(error, response, body) {
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
};

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
};

module.exports.getDocumentsInCollection = function(collectionID, completionHandler, errorHandler) {
	var groupsurl = savvydox.sdurl("/collections/" + collectionID + "/documents");

	request(groupsurl, function(error, response, body) {
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

module.exports.getAllDocuments = function(completionHandler, errorHandler) {
	request(savvydox.sdurl("/documents"), function(error, response, body) {
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

module.exports.postCollection = function(collection, completionHandler, errorHandler) {
	var url = savvydox.sdurl("/collections");

	var formData = {
		'collection': JSON.stringify(collection)
	};

	request.post({url: url, formData: formData}, function(error, response, body) {
		if (error || response.statusCode >= 400) {
			if (errorHandler) {
				if (error) {
					errorHandler(error);
				} else {
					errorHandler(response);
				}
			}
			return;
		}

		var responseBody = JSON.parse(body);
		completionHandler(responseBody);
	});
};

module.exports.putCollection = function(collection, completionHandler, errorHandler) {
	var url = savvydox.sdurl("/collections/" + collection.id);

	var formData = {
		'collection': JSON.stringify(collection)
	};

	request.put({url: url, formData: formData}, function(error, response, body) {
		if (error || response.statusCode >= 400) {
			if (errorHandler) {
				if (error) {
					errorHandler(error);
				} else {
					errorHandler(response);
				}
			}
			return;
		}

		var responseBody = JSON.parse(body);
		completionHandler(responseBody);
	});
};


module.exports.addDocumentToCollection = function(documentID, collectionID, completionHandler, errorHandler) {
	var url = savvydox.sdurl("/collections/" + collectionID + "/documents");

	var formData = {
		'document': documentID
	};

	request.post({url: url, body: "document=" + JSON.stringify(formData), headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
    }}, function(error, response, body) {
		if (error || response.statusCode >= 400) {
			if (errorHandler) {
				if (error) {
					errorHandler(error);
				} else {
					errorHandler(response);
				}
			}
			return;
		}

		if (response.statusCode == 204) {
			completionHandler(response);
		} else {
			errorHandler(response);
		}
	});
};

module.exports.removeDocumentFromCollection = function(documentID, collectionID, completionHandler, errorHandler) {
	var url = savvydox.sdurl("/collections/" + collectionID + "/documents/" + documentID);

	request.del({url: url}, function(error, response, body) {
		if (error || response.statusCode >= 400) {
			if (errorHandler) {
				if (error) {
					errorHandler(error);
				} else {
					errorHandler(response);
				}
			}
			return;
		}

		if (response.statusCode == 204) {
			completionHandler(response);
		} else {
			errorHandler(response);
		}
	});
};

module.exports.deleteCollection = function(collectionID, completionHandler, errorHandler) {
	var url = savvydox.sdurl("/collections/" + collectionID);

	request.del({url: url}, function(error, response, body) {
		if (error || response.statusCode >= 400) {
			if (errorHandler) {
				if (error) {
					errorHandler(error);
				} else {
					errorHandler(response);
				}
			}
			return;
		}

		if (response.statusCode == 204) {
			completionHandler(response);
		} else {
			errorHandler(response);
		}
	});
};

module.exports.deleteDocument = function(documentID, errorfunc) {
	const options = {
		method: 'DELETE',
		uri: savvydox.sdurl("/documents/" + documentID),
	}

	return rp(options)
		.then(function(resp) {
			return true;
		})
		.catch(function(err) {
			if (errorfunc) {
				errorfunc(err);
			}
			return false;
		});
};

module.exports.postNotes = async function(notes, errorfunc) {
	const formData = {
		'note': JSON.stringify(notes)
	};

	const options = {
		method: 'POST',
		uri: savvydox.sdurl("/notes"),
		formData: formData
	}

	return rp(options)
		.then(function(body) {
			return JSON.parse(body);
		})
		.catch(function(err) {
			if (errorfunc) {
				errorfunc(err);
			}
			return undefined;
		});
};

module.exports.getNote = async function(noteid, errorfunc) {
	const options = {
		method: 'GET',
		uri: savvydox.sdurl("/notes/" + noteid)
	};

	return rp(options)
		.then(function(body) {
			return JSON.parse(body);
		})
		.catch(function(err) {
			if (errorfunc) {
				errorfunc(err);
			}
			return undefined;
		});
};

module.exports.getNotes = async function(errorfunc) {
	const options = {
		method: 'GET',
		uri: savvydox.sdurl("/notes")
	};

	return rp(options)
		.then(function(body) {
			return JSON.parse(body);
		})
		.catch(function(err) {
			if (errorfunc) {
				errorfunc(err);
			}
			return undefined;
		});
};

module.exports.getDocumentNotes = async function(docid, errorfunc) {
	const options = {
		method: 'GET',
		uri: savvydox.sdurl("/documents/" + docid + "/notes")
	};

	return rp(options)
		.then(function(body) {
			return JSON.parse(body);
		})
		.catch(function(err) {
			if (errorfunc) {
				errorfunc(err);
			}
			return undefined;
		});
};

module.exports.deleteNote = async function(noteId, errorfunc) {
	const options = {
		method: 'DELETE',
		uri: savvydox.sdurl('/notes/' + noteId)
	};

	return rp(options)
		.then(function(body) {
			return true;
		})
		.catch(function(err) {
			if (errorfunc) {
				errorfunc(err);
			}
			return false;
		});
};

module.exports.getPublishedStatus = async function(errorfunc) {
	let options = {
		uri: savvydox.sdurl("/views/published-status")
	};

	return rp(options)
		.then(function (body) {
			return JSON.parse(body);
		})
		.catch(function(err) {
			if (errorfunc) {
				errorfunc(err);
			}
			return undefined;
		});
};

module.exports.postDocumentDownloadedEvent = async function(docId, version, errorfunc) {
	const payload = {
		'document': docId,
		'version': version
	};

	return savvydox.postEvent('document.downloaded', payload, errorfunc);
};

module.exports.postDocumentOpenedEvent = function(docId, version, errorfunc) {
	const payload = {
		'document': docId,
		'version': version
	};

	return savvydox.postEvent('document.opened', payload, errorfunc);
};

module.exports.postDocumentClosedEvent = function(docId, version, errorfunc) {
	const payload = {
		'document': docId,
		'version': version
	};

	return savvydox.postEvent('document.closed', payload, errorfunc);
};

module.exports.postPageOpenedEvent = function(docId, version, pageNum, errorfunc) {
	const payload = {
		'document': docId,
		'version': version,
		'page': pageNum
	};

	return savvydox.postEvent('document.page.opened', payload, errorfunc);
};

module.exports.postEvent = function(eventType, payload, errorfunc) {
	const formData = {
		'events': [
			{
				'eventType': eventType,
				'timestamp': new Date().toISOString(),
				'payload': payload
			}
		]
	};

	const options = {
		method: 'POST',
		uri: savvydox.sdurl("/events/"),
		formData: {
			'events': JSON.stringify(formData)
		}
	}

	return rp(options)
		.then(function(resp) {
			return true;
		})
		.catch(function(err) {
			if (errorfunc) {
				errorfunc(err);
			}
			return false;
		});
};

module.exports.sleep = async function(ms) {
	return new Promise((resolve) => {
		setTimeout(() => {
			resolve(true);
		}, ms)
	})
};
