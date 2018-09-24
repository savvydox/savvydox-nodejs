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

function addAuthHeaders(options, savvydox) {
	if (savvydox.user && savvydox.user.accessToken) {
		if (options.headers) {
			options.headers['Authorization'] = 'Bearer ' + savvydox.user.accessToken;
		} else {
			options.headers = {
				'Authorization': 'Bearer ' + savvydox.user.accessToken
			}
		}
	}
}

module.exports = {};

module.exports.sdurl = function(path) {
	var url = module.exports.host + "2" + path;
	return url;
};

var savvydox = module.exports;

module.exports.login = function(host, login, password, errorfunc) {
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

    return savvydox.rpWithResponse(options, errorfunc).then((user) => {
        savvydox.user = user;
        return savvydox.user;
    });
};

module.exports.token = function(host, login, password, errorfunc) {
	const options = {
		method: 'POST',
		url: module.exports.host + '2/oauth2/token',
		form: {
			'username': login, 
			'password': password, 
			'grant_type': 'password'
			}
	}

	return savvydox.rpWithResponse(options, errorfunc).then((response) => {
		savvydox.accessToken = response.accessToken;
		return response;
	});
};

module.exports.register = function(host, login, password, email, errorfunc) {
	savvydox.host = host;
	
	var formData = {
		'user': JSON.stringify({ 'loginName': login, 'password': password, 'primaryEmail':email })
	};

	const options = {
		method: 'POST',
		uri: module.exports.host + '2/registeruser?clientApiVersion=2',
		formData: formData
	};

    return savvydox.rpWithResponse(options, errorfunc).then((user) => {
        savvydox.user = user;
        return savvydox.user;
    });
};

module.exports.getServerInfo = function(errorfunc, detailLevel) {
	var url = module.exports.host + "2/serverinfo";
	if (detailLevel) {
		url += "?details=" + detailLevel;
	}

	const options = {
		method: 'GET',
		uri: url
	};

    return savvydox.rpWithResponse(options, errorfunc);
};

module.exports.postDocument = function(document, contentPath, sourcePath, errorfunc) {
    const docurl = savvydox.sdurl("/documents/" + document.id);

    const options = {
		method: 'GET',
		uri: docurl
    };
	
	addAuthHeaders(options, savvydox);

	return rp(options)
		.then(function(body) {
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

            const options = {
                method: 'POST',
                uri: docurl,
                formData: formData
            }
        
            return savvydox.rpWithResponse(options, errorfunc);
		})
		.catch(function(err) {
			if (errorfunc) {
				errorfunc(err);
			}
			return undefined;
		});
};

// To attach source, pass in sourceInfo that has path, fileName, and contentType properties
module.exports.postNewDocument = function(document, contentPath, sourceInfo, errorfunc) {	
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

    return savvydox.rpWithResponse(options, errorfunc);
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

    return savvydox.rpWithResponse(options, errorfunc);
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
	
module.exports.getDocument = function(documentid, errorfunc) {
    const options = {
		method: 'GET',
		uri: savvydox.sdurl("/documents/" + documentid)
	};

    return savvydox.rpWithResponse(options, errorfunc);
};

module.exports.getCollections = function(errorfunc) {
    const options = {
		method: 'GET',
		uri: savvydox.sdurl("/collections")
	};

    return savvydox.rpWithResponse(options, errorfunc);
};
			
module.exports.getDocumentRecipients = function(documentid, errorfunc) {
	var recipurl = savvydox.sdurl("/documents/" + documentid + "/recipients");
    recipurl += "?format=decompose";
    
    const options = {
		method: 'GET',
		uri: recipurl
	};

    return savvydox.rpWithResponse(options, errorfunc);
};
			
module.exports.getCollectionRecipients = function(collectionid, errorfunc) {
	var recipurl = savvydox.sdurl("/collections/" + collectionid + "/recipients");
	recipurl += "?format=decompose";
    
    const options = {
		method: 'GET',
		uri: recipurl
	};

    return savvydox.rpWithResponse(options, errorfunc);
};

module.exports.getDocumentTasks = function(documentid, completionHandler, errorHandler) {
	var tasksurl = savvydox.sdurl("/usertasks/document/" + event.payload.document);
	tasksurl += "?format=decompose";

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

module.exports.getMyGroups = function(errorfunc) {
    const options = {
		method: 'GET',
		uri: savvydox.sdurl("/groups")
	};

    return savvydox.rpWithResponse(options, errorfunc);
};

module.exports.getGroup = function(groupid, errorfunc) {
    const options = {
		method: 'GET',
		uri: savvydox.sdurl("/groups/" + groupid)
	};

    return savvydox.rpWithResponse(options, errorfunc);
};

module.exports.postGroup = function(group, errorfunc) {
	const formData = {
		'group': JSON.stringify(group)
	};

	const options = {
		method: 'POST',
		uri: savvydox.sdurl("/groups"),
		formData: formData
	}

    return savvydox.rpWithResponse(options, errorfunc);
};

module.exports.putGroup = function(group, errorfunc) {
	var formData = {
		'group': JSON.stringify(group)
	};
	const options = {
		method: 'PUT',
		uri: savvydox.sdurl("/groups/" + group.id),
		formData: formData
	}

    return savvydox.rpWithResponse(options, errorfunc);
};

module.exports.getDocumentsInCollection = function(collectionID, errorfunc) {
    const options = {
		method: 'GET',
		uri: savvydox.sdurl("/collections/" + collectionID + "/documents")
	};

    return savvydox.rpWithResponse(options, errorfunc);
};

module.exports.getAllDocuments = function(errorfunc) {
    const options = {
		method: 'GET',
		uri: savvydox.sdurl("/documents")
	};

    return savvydox.rpWithResponse(options, errorfunc);
};

module.exports.postCollection = function(collection, errorfunc) {
	var formData = {
		'collection': JSON.stringify(collection)
	};

	const options = {
		method: 'POST',
		uri: savvydox.sdurl("/collections"),
		formData: formData
	}

    return savvydox.rpWithResponse(options, errorfunc);
};

module.exports.putCollection = function(collection, errorfunc) {
	var formData = {
		'collection': JSON.stringify(collection)
	};

	const options = {
		method: 'PUT',
		uri: savvydox.sdurl("/collections/" + collection.id),
		formData: formData
	}

    return savvydox.rpWithResponse(options, errorfunc);
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

module.exports.removeDocumentFromCollection = function(documentID, collectionID, errorfunc) {
    const options = {
		method: 'DELETE',
		uri: savvydox.sdurl("/collections/" + collectionID + "/documents/" + documentID)
	}

    return savvydox.rpWithoutResponse(options, errorfunc);
};

module.exports.deleteCollection = function(collectionID, errorfunc) {
    const options = {
		method: 'DELETE',
		uri: savvydox.sdurl("/collections/" + collectionID),
	}

    return savvydox.rpWithoutResponse(options, errorfunc);
};

module.exports.deleteDocument = function(documentID, errorfunc) {
	const options = {
		method: 'DELETE',
		uri: savvydox.sdurl("/documents/" + documentID),
	}

    return savvydox.rpWithoutResponse(options, errorfunc);
};

module.exports.postNotes = function(notes, errorfunc) {
	const formData = {
		'note': JSON.stringify(notes)
	};

	const options = {
		method: 'POST',
		uri: savvydox.sdurl("/notes"),
		formData: formData
	}

    return savvydox.rpWithResponse(options, errorfunc);
};

module.exports.getNote = function(noteid, errorfunc) {
	const options = {
		method: 'GET',
		uri: savvydox.sdurl("/notes/" + noteid)
	};

    return savvydox.rpWithResponse(options, errorfunc);
};

module.exports.getNotes = function(errorfunc) {
	const options = {
		method: 'GET',
		uri: savvydox.sdurl("/notes")
	};

    return savvydox.rpWithResponse(options, errorfunc);
};

module.exports.getDocumentNotes = function(docid, errorfunc) {
	const options = {
		method: 'GET',
		uri: savvydox.sdurl("/documents/" + docid + "/notes")
	};

    return savvydox.rpWithResponse(options, errorfunc);
};

module.exports.deleteNote = function(noteId, errorfunc) {
	const options = {
		method: 'DELETE',
		uri: savvydox.sdurl('/notes/' + noteId)
	};

    return savvydox.rpWithoutResponse(options, errorfunc);
};

module.exports.getPublishedStatus = function(docId, errorfunc) {
    let uri = '/views/published-status';

    if (docId) {
        uri += '/' + docId;
    }

	let options = {
		uri: savvydox.sdurl(uri)
	};

    return savvydox.rpWithResponse(options, errorfunc);
};

module.exports.postDocumentDownloadedEvent = function(docId, version, errorfunc) {
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

module.exports.postReviewedEvent = function(docId, version, errorfunc) {
	const payload = {
		'document': docId,
		'version': version,
		'reviewed': true
	};

	return savvydox.postEvent('document.reviewed', payload, errorfunc);
};

module.exports.postApprovedEvent = function(docId, version, message, errorfunc) {
	const payload = {
		'document': docId,
		'version': version,
        'approved': 'approved',
        'message': message
	};

	return savvydox.postEvent('document.approved', payload, errorfunc);
};

module.exports.postRejectedEvent = function(docId, version, message, errorfunc) {
	const payload = {
		'document': docId,
		'version': version,
		'approved': 'rejected',
        'message': message
	};

	return savvydox.postEvent('document.approved', payload, errorfunc);
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

    return savvydox.rpWithoutResponse(options, errorfunc);
};

module.exports.sleep = function(ms) {
	return new Promise((resolve) => {
		setTimeout(() => {
			resolve(true);
		}, ms)
	})
};

module.exports.rpWithResponse = function(options, errorfunc) {
	addAuthHeaders(options, savvydox);

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

module.exports.rpWithoutResponse = function(options, errorfunc) {
	addAuthHeaders(options, savvydox);

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
