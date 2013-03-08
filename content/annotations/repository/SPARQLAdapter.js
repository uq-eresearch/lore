/** 
 * @class lore.anno.repos.SPARQLAdapter Access and store annotations using fuseki SPARQL api
 */
lore.anno.repos.SPARQLAdapter = Ext.extend(lore.anno.repos.RepositoryAdapter,{
	
    constructor : function(baseURL) {
        lore.anno.repos.SPARQLAdapter.superclass.constructor.call(this, baseURL);
        this.reposURL = baseURL;
        this.idPrefix = this.reposURL;
        this.unsavedSuffix = "#unsaved";
    },
    getAnnotatesQuery : function(matchuri, scope, filterFunction){
    	 var queryUrl = this.reposURL + "/query?query=";
    	 queryUrl += encodeURIComponent("SELECT DISTINCT ?g ?type ?creator ?lang ?title ?context ?resource ?created ?modified ?body ?bodyURL ?privateAnno ?agentId ");
    	 queryUrl += encodeURIComponent("WHERE {{ ?g <http://www.openannotation.org/ns/hasTarget> <" + matchuri + ">.}");
    	 queryUrl += encodeURIComponent("UNION { ?g <http://www.openannotation.org/ns/hasTarget> ?t . ?t <http://purl.org/dc/terms/isPartOf><" + matchuri +">}");
    	 queryUrl += encodeURIComponent("UNION { ?g <http://www.openannotation.org/ns/hasTarget> ?t . ?t <http://www.openannotation.org/ns/constrains><" + matchuri +">}");
    	 queryUrl += encodeURIComponent("OPTIONAL {?g a ?type}. ");
    	 queryUrl += encodeURIComponent("OPTIONAL {?g <http://purl.org/dc/terms/creator> ?user. " +
    	 										"?user <http://xmlns.com/foaf/0.1/name> ?creator}. ");
    	 queryUrl += encodeURIComponent("OPTIONAL {?g <http://purl.org/dc/elements/1.1/language> ?lang}. ");
    	 queryUrl += encodeURIComponent("OPTIONAL {?g <http://purl.org/dc/elements/1.1/title> ?title}. ");
    	 queryUrl += encodeURIComponent("OPTIONAL {?g <http://www.openannotation.org/ns/hasTarget> ?context}. ");
    	 queryUrl += encodeURIComponent("OPTIONAL {?g <http://www.openannotation.org/ns/hasTarget> ?resource}. ");
    	 queryUrl += encodeURIComponent("OPTIONAL {?g <http://purl.org/dc/terms/created> ?created}. ");
    	 queryUrl += encodeURIComponent("OPTIONAL {?g <http://purl.org/dc/terms/modified> ?modified}.");
    	 queryUrl += encodeURIComponent("OPTIONAL {?g <http://www.openannotation.org/ns/hasBody> ?bodyURL. " +
    	 										"?bodyURL <http://www.w3.org/2011/content#rest> ?body}. ");
    	 queryUrl += encodeURIComponent("OPTIONAL {?g <http://auselit.metadata.net/lorestore/isPrivate> ?privateAnno}. ");
    	 queryUrl += encodeURIComponent("OPTIONAL {?g <http://auselit.metadata.net/lorestore/user> ?agentId}. }");
    	 queryUrl += "&output=json";

         Ext.Ajax.request({
             url: queryUrl,
             method: "GET",
             disableCaching: false,
             success: function(resp, opt) {
                 try {
                     lore.debug.anno("Success retrieving annotations from " + opt.url, resp);
                     this.handleSPARQLAnnotationsLoaded(resp, filterFunction);
                 } catch (e ) {
                     lore.debug.anno("Error getting annotations",e);
                 }
             },
             failure: function(resp, opt){
                 try {
                     this.fireEvent('servererror', 'list', resp);
                     lore.debug.anno("Unable to retrieve annotations from " + opt.url, resp);
                     lore.anno.ui.loreError("Failure loading annotations for page.");

                 } catch (e ) {
                     lore.debug.anno("Error on failure loading annotations",e);
                 }
             },
             scope:scope
         });
    },
    getRepliesQuery : function(annoID,  scope){
    	var queryUrl = this.reposURL + "/query?query=";
   	 	queryUrl += encodeURIComponent("SELECT DISTINCT ?g ?type ?creator ?lang ?title ?context ?resource ?created ?modified ?body ?bodyURL ?privateAnno ?agentId ");
   	 	queryUrl += encodeURIComponent("WHERE {{ ?g <http://www.openannotation.org/ns/hasTarget> <" + annoID + ">.}");
   	 	queryUrl += encodeURIComponent("UNION { ?g <http://www.openannotation.org/ns/hasTarget> ?t . ?t <http://purl.org/dc/terms/isPartOf><" + annoID +">}");
   	 	queryUrl += encodeURIComponent("UNION { ?g <http://www.openannotation.org/ns/hasTarget> ?t . ?t <http://www.openannotation.org/ns/constrains><" + annoID +">}");
   	 	queryUrl += encodeURIComponent("OPTIONAL {?g a ?type}. ");
   	 	queryUrl += encodeURIComponent("OPTIONAL {?g <http://purl.org/dc/terms/creator> ?user. " +
	 											"?user <http://xmlns.com/foaf/0.1/name> ?creator}. ");
   	 	queryUrl += encodeURIComponent("OPTIONAL {?g <http://purl.org/dc/elements/1.1/language> ?lang}. ");
   	 	queryUrl += encodeURIComponent("OPTIONAL {?g <http://purl.org/dc/elements/1.1/title> ?title}. ");
   	 	queryUrl += encodeURIComponent("OPTIONAL {?g <http://www.openannotation.org/ns/hasTarget> ?context}. ");
   	 	queryUrl += encodeURIComponent("OPTIONAL {?g <http://www.openannotation.org/ns/hasTarget> ?resource}. ");
   	 	queryUrl += encodeURIComponent("OPTIONAL {?g <http://purl.org/dc/terms/created> ?created}. ");
   	 	queryUrl += encodeURIComponent("OPTIONAL {?g <http://purl.org/dc/terms/modified> ?modified}.");
   	 	queryUrl += encodeURIComponent("OPTIONAL {?g <http://www.openannotation.org/ns/hasBody> ?bodyURL. " +
	 											"?bodyURL <http://www.w3.org/2011/content#rest> ?body}. ");
   	 	queryUrl += encodeURIComponent("OPTIONAL {?g <http://auselit.metadata.net/lorestore/isPrivate> ?privateAnno}. ");
   	 	queryUrl += encodeURIComponent("OPTIONAL {?g <http://auselit.metadata.net/lorestore/user> ?agentId}. }");
   	 	queryUrl += "&output=json";
   	    
        Ext.Ajax.request({
            disableCaching: false, 
            method: "GET",
            url: queryUrl, 
            success: function(resp,opt){
                this.handleAnnotationRepliesLoaded(resp,true);
            },
            failure: function(resp, opt){
                lore.debug.anno("Unable to obtain replies for " + opt.url, resp);
            },
            scope:scope
        });
    },
    
    saveAnnotation : function (annoRec, resultCallback,t){  
        var annoRDF = t.createAnnoOAC([annoRec.data], t.annods, true, "xml");        
        
        var boundary = "---------------------------7da24f2e50046";
        var body = 'Content-Type: multipart/form-data; boundary=' + boundary + '\r\n\r\n'
          + '--' + boundary + '\r\n'
          + 'Content-Disposition: form-data; name="UNSET FILE NAME"; filename="temp.xml"\r\n'
          + 'Content-type: text/xml\r\n\r\n'
          + annoRDF + '\r\n'
          + '--' + boundary + '\r\n'
          + 'Content-Disposition: form-data; name="graph";\r\n\r\n'
          + 'default\r\n'
          + '--' + boundary + '--';
            
        var insertData = function() {
            xhr.setRequestHeader("Content-type", "multipart/form-data; boundary=" + boundary);
            xhr.onreadystatechange = function(){
    	        try {
    	            if (xhr.readyState == 4) {
    	                if (xhr.status == successfulStatus) {
    	                    resultCallback(xhr, action);
    	                    t.fireEvent("committedannotation", action, annoRec);
    	                } else {
    	                    t.fireEvent('servererror', action, xhr);
    	                }
    	            }
    	
    	        } catch(e) {
    	            lore.debug.anno("Error sending annotation to server", e);
    	        }
    	    };         
            xhr.send(body);
            
            lore.debug.anno("RDF of annotation", annoRDF);
        }
        
        var xhr = new XMLHttpRequest();
        if (annoRec.data.isNew()) {
            lore.debug.anno("creating new annotation");
            var action = 'create';
            var successfulStatus = 200;
            xhr.open("POST", this.reposURL + "/upload");
            insertData();
        } else {
            lore.debug.anno("updating existing annotation");
            var action = 'create';
            var successfulStatus = 200;
            xhr.open("POST", this.reposURL + "/upload");
            
            var updateStr = "DELETE WHERE {<" + annoRec.data.id + "> ?p1 ?o1. " + 
	    		"<" + annoRec.data.id + "> <http://purl.org/dc/terms/creator> ?creator. ?creator ?p2 ?o2. " + 
	    		"<" + annoRec.data.id + "> <http://www.openannotation.org/ns/hasBody> ?body. ?body ?p3 ?o3. " + 
	    		"<" + annoRec.data.id + "> <http://www.openannotation.org/ns/hasTarget> ?target. ?target ?p4 ?o4. }";
	
	        Ext.Ajax.request({
	            url: this.reposURL + "/update",
	            params: {
	            	update: updateStr
	            },
	            success: function(){
	            	insertData();
	            },
	            method: "POST"
	        });
        }    
    },
    /**
     * Delete the annotation
     * @param {String} id The URI of the annotation to remove 
     **/
    deleteAnnotation : function(id, success, failure, scope){
    	var updateStr = "DELETE WHERE {<" + id + "> ?p1 ?o1. " + 
    		"<" + id + "> <http://purl.org/dc/terms/creator> ?creator. ?creator ?p2 ?o2. " + 
    		"<" + id + "> <http://www.openannotation.org/ns/hasBody> ?body. ?body ?p3 ?o3. " + 
    		"<" + id + "> <http://www.openannotation.org/ns/hasTarget> ?target. ?target ?p4 ?o4. }";

        Ext.Ajax.request({
            url: this.reposURL + "/update",
            params: {
            	update: updateStr
            },
            success: function(resp){
                try{
                    if (success){
                        Ext.each([resp],success, scope);
                    }
                } catch (ex){
                    lore.debug.anno("Error after delete annotation",ex);
                }
            },

            failure: function(resp, opts){
                try {
                    if (failure){
                        Ext.each([{resp:resp,opts:opts}],failure,scope)
                    }
                } catch (ex){
                    lore.debug.anno("Error deleting annotation",ex);
                }
            },
            method: "POST",
            scope: scope
        });
    },
    generateID : function() {
        return this.reposURL + this.unsavedSuffix;
    }
});