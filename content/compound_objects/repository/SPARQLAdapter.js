/** 
 * @class lore.ore.repos.SPARQLAdapter Access and store Resource Maps using a
 *  SPARQL based respository
 * @extends lore.ore.repos.RepositoryAdapter
 */
lore.ore.repos.SPARQLAdapter = Ext.extend(lore.ore.repos.RepositoryAdapter,{
	
    constructor : function(baseURL) {
        lore.ore.repos.SPARQLAdapter.superclass.constructor.call(this, baseURL);
        this.reposURL = baseURL;
        this.idPrefix = this.reposURL;
        this.unsavedSuffix = "#unsaved";
    },
    getCompoundObjects : function(matchuri, matchpred, matchval, isSearchQuery){    	
        var ra = this;
        try {
           var escapedURL = "";
           var altURL = "";
           if (matchuri){
               escapedURL = encodeURIComponent(matchuri.replace(/}/g,'%257D').replace(/{/g,'%257B'));
           }
           var queryURL = this.reposURL + "/query?query=";
		   queryURL += encodeURIComponent("SELECT DISTINCT ?g ?a ?m ?t ?priv ");
		   queryURL += encodeURIComponent("WHERE { GRAPH ?g {");
		   queryURL += encodeURIComponent("?g <http://www.openarchives.org/ore/terms/describes> ?r.");
		   queryURL += encodeURIComponent("?r <http://www.openarchives.org/ore/terms/aggregates> <" + matchuri + ">.");
		   queryURL += encodeURIComponent("OPTIONAL {?g <http://purl.org/dc/elements/1.1/creator> ?a}.");
		   queryURL += encodeURIComponent("OPTIONAL {?g <http://purl.org/dc/terms/modified> ?m}.");
		   queryURL += encodeURIComponent("OPTIONAL {?g <http://purl.org/dc/elements/1.1/title> ?t}.");
		   queryURL += encodeURIComponent("OPTIONAL {?g <http://auselit.metadata.net/lorestore/isPrivate> ?priv}.");
		   queryURL += encodeURIComponent("OPTIONAL {?g <http://auselit.metadata.net/lorestore/isPrivate> ?user}.");
		   queryURL += encodeURIComponent("}}");
		   queryURL += "&output=xml";   	
            
            var xhr = new XMLHttpRequest();
            lore.debug.ore("SPARQLAdapter.getCompoundObjects", {queryURL:queryURL});
            xhr.open('GET', queryURL);
            xhr.onreadystatechange = function(aEvt) {
                if (xhr.readyState == 4) {
                    if (xhr.responseText && xhr.status != 204 && xhr.status < 400) {
                        var xmldoc = xhr.responseXML;
                        var listname = (isSearchQuery? "search" : "browse");  
                        var result = {};
                        if (xmldoc) {
                            result = xmldoc.getElementsByTagNameNS(lore.constants.NAMESPACES["sparql"], "result");
                        }
                        lore.ore.coListManager.clear(listname);
                        
                        if (result.length > 0){
                            var coList = [];
                            var processed = {};
                            for (var i = 0; i < result.length; i++) {
                                var theobj = ra.parseCOFromXML(result[i]);
                                var resultIndex = processed[theobj.uri];
                                var existing = theobj; 
                                if (resultIndex >= 0){
                                    existing = coList[resultIndex];
                                    if (existing && !existing.creator.match(theobj.creator)){
                                        existing.creator = existing.creator + " &amp; " + theobj.creator;
                                    }
                                } else {
                                   if (matchval) {theobj.searchval = matchval;}
                                   coList.push(theobj);
                                   processed[theobj.uri] = coList.length - 1; 
                                }    
                            }
                            lore.ore.coListManager.add(coList,listname);
                        } 
                    } else if (xhr.status == 404){
                        lore.debug.ore("Error: 404 accessing Resource Map repository",xhr);
                    }
                }
            };
            xhr.send(null);
        } catch (e) {
            lore.debug.ore("Error: Unable to retrieve Resource Maps",e);
            lore.ore.ui.vp.warning("Unable to retrieve Resource Maps");
        }
    },
    loadCompoundObject : function(remid, callback, failcallback){
         Ext.Ajax.request({
        		url: this.reposURL + "/data?graph=" + remid,
                headers: {
                    Accept: 'application/rdf+xml'
                },
                method: "GET",
                disableCaching: false,
                success: callback,
                failure: failcallback
            }); 
    },
    saveCompoundObject : function (theco,callback){
        var remid = theco.uri;

        var therdf = theco.serialize('application/rdf+xml');
        
    	var boundary = "---------------------------7da24f2e50046";
        var body = 'Content-Type: multipart/form-data; boundary=' + boundary + '\r\n\r\n'
          + '--' + boundary + '\r\n'
          + 'Content-Disposition: form-data; name=\"UNSET FILE NAME\"; filename=\"temp.rdf\"\r\n'
          + 'Content-type: application/rdf+xml\r\n\r\n'
          + therdf + '\r\n'
          + '--' + boundary + '\r\n'
          + 'Content-Disposition: form-data; name=\"graph\";\r\n\r\n'
          + theco["uri"] + '\r\n'
          + '--' + boundary + '--';
                
    	lore.debug.ore("YOMAN1");
    	lore.debug.ore(this.reposURL + "/upload");
        
        var insertData = function() {
            theURL = this.reposURL + "/upload";
            xhr.onreadystatechange = function() {
                if (xhr.readyState == 4) {
                    Ext.Msg.hide();
                    if (xhr.status == 200) { // OK
                        lore.debug.ore("lorestore: RDF saved", xhr);
                        lore.ore.ui.vp.info("Resource Map " + remid + " saved");
                        callback(remid);
                    } else if (xhr.status == 201) { // Created
                        lore.debug.ore("lorestore: RDF saved", xhr);
                        var location = xhr.getResponseHeader("Location");
                        lore.debug.ore("New CO URI is: " + location);
                        lore.ore.ui.vp.info("Resource Map " + remid + " saved");
                        lore.ore.controller.loadCompoundObject(xhr);
                        callback(location);
                    } else {
                        lore.debug.ore("Error: Unable to save Resource Map " + remid + " to " + theURL, {
                            xhr : xhr,
                            headers : xhr.getAllResponseHeaders()
                            
                        });
                        lore.ore.ui.vp.error('Unable to save to repository: ' + xhr.statusText);
                        var msg;
                        if (xhr.status == 403) {
                            msg = "<b>Permission Denied</b><br><br>You are not signed in or you do not own this Resource Map</a>"
                        } else {
                            msg = '<b>' + xhr.statusText + '</b>'  
                                + '<br><br>If an error has occurred, please save your Resource Map to a file using the <i>Export to RDF/XML</i> menu option from the toolbar and contact the Aus-e-Lit team with details of the error for further assistance.'
                                + '<br><br><a style="text-decoration:underline;color:blue" href="#" onclick="lore.util.launchWindow(\'data:text/html,' + encodeURIComponent(xhr.responseText) + '\',false,window)\">View Details</a>';
                        }
                        Ext.Msg.show({
                            title : 'Unable to save Resource Map',
                            buttons : Ext.MessageBox.OK,
                            defaultTextHeight: 100,
                            msg : msg
                        });
                        
                    }
                }
            };
            xhr.send(body);
        }
        
    	var xhr = new XMLHttpRequest();
    	
        xhr.open("POST", this.reposURL + "/upload");
        xhr.setRequestHeader("Content-type", "multipart/form-data; boundary=" + boundary);
        
        var oThis = this;
        Ext.Msg.show({
               msg: 'Saving Resource Map to repository...',
               width:250,
               defaultTextHeight: 0,
               closable: false,
               cls: 'co-load-msg'
           });
        try {
        	//lore.ore.am.runWithAuthorisation(function() {    
        	this.deleteCompoundObject(remid, insertData);
            //});
        } catch (e) {
            lore.debug.ore("Error saving Resource Map", e);
        }
    },
    loadNew : function(oldURI, newURI) {
        lore.ore.cache.remove(oldURI);
        
        controller.loadCompoundObjectFromURL(newURI);
        lore.ore.reposAdapter.loadCompoundObject(rdfURL, lore.ore.controller.loadCompoundObject, lore.ore.controller.afterLoadCompoundObjectFail);
    },
    deleteCompoundObject : function(remid, callback){
        lore.debug.ore("deleting from lorestore repository " + remid);
        try {
    	   	//lore.ore.am.runWithAuthorisation(function() {
            var xhr = new XMLHttpRequest();
            xhr.open("POST", this.reposURL + "/update");  
            xhr.onreadystatechange= function(){
                if (xhr.readyState == 4) {
                    if (xhr.status == 200) { // OK
                        callback(remid);
                    } else {
                        lore.ore.ui.vp.error('Unable to delete Resource Map' + xhr.statusText);
                         
                        lore.debug.ore("Error: Unable to delete Resource Map", {
                            xhr : xhr,
                            headers : xhr.getAllResponseHeaders()
                        });
                        var msg = '<b>' + xhr.statusText + '</b>'  
                                + '<br><br>If an error has occurred please contact the Aus-e-Lit team with details of the error for further assistance.'
                                + '<br><br><a style="text-decoration:underline;color:blue" href="#" onclick="lore.util.launchWindow(\'data:text/html,' + encodeURIComponent(xhr.responseText) + '\',false,window)\">View Details</a>';  
                        Ext.Msg.show({
                            title : 'Unable to delete Resource Map',
                            buttons : Ext.MessageBox.OK,
                            msg : msg
                        });
                    }
                }
            };
            xhr.setRequestHeader("Content-type","application/x-www-form-urlencoded");
            xhr.send("update=CLEAR GRAPH <" + remid + ">");
            //});
        } catch (e){
            Ext.MessageBox.hide();
            lore.debug.ore("Error in SPARQLAdapter deleting Resource Map",e);
        }        
    },
    /**
     * Performs a SPARQL query to retrieve data for Explore view
     * @param {} uri
     * @param {} title
     * @param {} isCompoundObject
     * @param {} callback
     * @return {}
     */
    getExploreData : function(uri,title,isCompoundObject, callback){
        var eid = uri.replace(/&amp;/g,'&').replace(/&amp;/g,'&');
        var eid2 = escape(eid);
        try {
            var queryURL = this.reposURL
                    + "?exploreFrom=" 
                    + eid2;
            
            if (this.exploreStylesheet){
               
                var xsltproc = new XSLTProcessor();
                var xhr = new XMLHttpRequest();                
                xhr.overrideMimeType('text/xml');
                
            
               xsltproc.importStylesheet(this.exploreStylesheet);
               xsltproc.setParameter(null,'subj',eid);
               if (title){
                   xsltproc.setParameter(null,'title',title);
               }
               if (isCompoundObject){
                   xsltproc.setParameter(null,'isCompoundObject','y');
               }
            
               xhr.open("GET",queryURL);
               xhr.onreadystatechange= function(){
                    if (xhr.readyState == 4) {
                        var rdfDoc = xhr.responseXML;
                        var serializer = new XMLSerializer();
                        var thefrag = xsltproc.transformToFragment(rdfDoc, document);
                        var jsonobj = Ext.decode(serializer.serializeToString(thefrag));
                        callback(jsonobj);
                    }
               }
               xhr.send(null);
            } else {
                lore.debug.ore("Explore view stylesheet not ready",this);
                lore.ore.ui.vp.info(" ");
            }
        } catch (ex){
            lore.debug.ore("Error in SPARQLAdapter.getExploreData",ex);
        } 
    },
    
    generateID : function() {
    	return this.reposURL + "/" + lore.draw2d.UUID.create();
    },
    /**
    * Parses Resource Map details from a SPARQL XML result
    * @param {XMLNode} XML node to be parsed
    * Returns an object with the following properties:
    *  {string} uri The identifier of the Resource Map 
    *  {string} title The (Dublin Core) title of the Resource Map 
    *  {string} creator The (Dublin Core) creator of the Resource Map 
    *  {Date} modified The date on which the Resource Map was modified (from dcterms:modified) 
    *  {string} match The value of the subject, predicate or object from the triple that matched the search 
    *  {Date} acessed The date this Resource Map was last accessed (from the browser history) 
    * */
   parseCOFromXML: function(/*Node*/result){
        var props = {};
        var bindings, node, attr, nodeVal;
        props.title = "Untitled";
        props.creator = "Anonymous";
        try {  
           bindings = result.getElementsByTagName('binding');
           for (var j = 0; j < bindings.length; j++){  
            attr = bindings[j].getAttribute('name');
            if (attr =='g'){ //graph uri
                node = bindings[j].getElementsByTagName('uri'); 
                props.uri = lore.util.safeGetFirstChildValue(node);
            } else if (attr == 'v'){
                node = bindings[j].getElementsByTagName('literal');
                nodeVal = lore.util.safeGetFirstChildValue(node);
                if (!nodeVal){
                    node = bindings[j].getElementsByTagName('uri');
                }
                props.match = lore.util.safeGetFirstChildValue(node);
            } else {
                node = bindings[j].getElementsByTagName('literal');
                nodeVal = lore.util.safeGetFirstChildValue(node);
                if (attr == 't' && nodeVal){ //title
                    props.title = nodeVal;
                } else if (attr == 'a' && nodeVal){// dc:creator
                    props.creator = nodeVal;
                } else if (attr == 'priv' && nodeVal) { // isPrivate
                    props.isPrivate = nodeVal;
                }
                else if (attr == 'm' && nodeVal){ // dcterms:modified
                    props.modified = nodeVal;
                    try {
                        var modDate = Date.parseDate(props.modified,'c') || Date.parseDate(props.modified,'Y-m-d');
                        if (modDate){
                            props.modified = modDate;
                        }
                    } catch (e){
                        lore.debug.ore("Error in parseCOFromXML converting date",e);
                    }
                } 
            }
           }
        } catch (ex) {
            lore.debug.ore("Error: Unable to process Resource Map result list", ex);
        }
        return props;
    }
});


 