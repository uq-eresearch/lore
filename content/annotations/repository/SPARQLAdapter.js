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
    	 queryUrl += encodeURIComponent("WHERE {{GRAPH ?g {?g <http://www.openannotation.org/ns/hasTarget> <" + matchuri + ">.}}");
    	 queryUrl += encodeURIComponent("UNION {GRAPH ?g {?g <http://www.openannotation.org/ns/hasTarget> ?t . ?t <http://purl.org/dc/terms/isPartOf><" + matchuri +">}}");
    	 queryUrl += encodeURIComponent("UNION {GRAPH ?g {?g <http://www.openannotation.org/ns/hasTarget> ?t . ?t <http://www.openannotation.org/ns/constrains><" + matchuri +">}}");
    	 queryUrl += encodeURIComponent("OPTIONAL {GRAPH ?g {?g a ?type}}. ");
    	 queryUrl += encodeURIComponent("OPTIONAL {GRAPH ?g {?g <http://purl.org/dc/terms/creator> ?user. " +
    	 										"?user <http://xmlns.com/foaf/0.1/name> ?creator}}. ");
    	 queryUrl += encodeURIComponent("OPTIONAL {GRAPH ?g {?g <http://purl.org/dc/elements/1.1/language> ?lang}}. ");
    	 queryUrl += encodeURIComponent("OPTIONAL {GRAPH ?g {?g <http://purl.org/dc/elements/1.1/title> ?title}}. ");
    	 queryUrl += encodeURIComponent("OPTIONAL {GRAPH ?g {?g <http://www.openannotation.org/ns/hasTarget> ?context}}. ");
    	 queryUrl += encodeURIComponent("OPTIONAL {GRAPH ?g {?g <http://www.openannotation.org/ns/hasTarget> ?resource}}. ");
    	 queryUrl += encodeURIComponent("OPTIONAL {GRAPH ?g {?g <http://purl.org/dc/terms/created> ?created}}. ");
    	 queryUrl += encodeURIComponent("OPTIONAL {GRAPH ?g {?g <http://purl.org/dc/terms/modified> ?modified}}.");
    	 queryUrl += encodeURIComponent("OPTIONAL {GRAPH ?g {?g <http://www.openannotation.org/ns/hasBody> ?bodyURL. " +
    	 										"?bodyURL <http://www.w3.org/2011/content#rest> ?body}}. ");
    	 queryUrl += encodeURIComponent("OPTIONAL {GRAPH ?g {?g <http://auselit.metadata.net/lorestore/isPrivate> ?privateAnno}}. ");
    	 queryUrl += encodeURIComponent("OPTIONAL {GRAPH ?g {?g <http://auselit.metadata.net/lorestore/user> ?agentId}}. }");
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
   	 	queryUrl += encodeURIComponent("WHERE {{GRAPH ?g { ?g <http://www.openannotation.org/ns/hasTarget> <" + annoID + ">.}}");
   	 	queryUrl += encodeURIComponent("UNION {GRAPH ?g { ?g <http://www.openannotation.org/ns/hasTarget> ?t . ?t <http://purl.org/dc/terms/isPartOf><" + annoID +">}}");
   	 	queryUrl += encodeURIComponent("UNION {GRAPH ?g { ?g <http://www.openannotation.org/ns/hasTarget> ?t . ?t <http://www.openannotation.org/ns/constrains><" + annoID +">}}");
   	 	queryUrl += encodeURIComponent("OPTIONAL {GRAPH ?g {?g a ?type}}. ");
   	 	queryUrl += encodeURIComponent("OPTIONAL {GRAPH ?g {?g <http://purl.org/dc/terms/creator> ?user. " +
	 											"?user <http://xmlns.com/foaf/0.1/name> ?creator}}. ");
   	 	queryUrl += encodeURIComponent("OPTIONAL {GRAPH ?g {?g <http://purl.org/dc/elements/1.1/language> ?lang}}. ");
   	 	queryUrl += encodeURIComponent("OPTIONAL {GRAPH ?g {?g <http://purl.org/dc/elements/1.1/title> ?title}}. ");
   	 	queryUrl += encodeURIComponent("OPTIONAL {GRAPH ?g {?g <http://www.openannotation.org/ns/hasTarget> ?context}}. ");
   	 	queryUrl += encodeURIComponent("OPTIONAL {GRAPH ?g {?g <http://www.openannotation.org/ns/hasTarget> ?resource}}. ");
   	 	queryUrl += encodeURIComponent("OPTIONAL {GRAPH ?g {?g <http://purl.org/dc/terms/created> ?created}}. ");
   	 	queryUrl += encodeURIComponent("OPTIONAL {GRAPH ?g {?g <http://purl.org/dc/terms/modified> ?modified}}.");
   	 	queryUrl += encodeURIComponent("OPTIONAL {GRAPH ?g {?g <http://www.openannotation.org/ns/hasBody> ?bodyURL. " +
	 											"?bodyURL <http://www.w3.org/2011/content#rest> ?body}}. ");
   	 	queryUrl += encodeURIComponent("OPTIONAL {GRAPH ?g {?g <http://auselit.metadata.net/lorestore/isPrivate> ?privateAnno}}. ");
   	 	queryUrl += encodeURIComponent("OPTIONAL {GRAPH ?g {?g <http://auselit.metadata.net/lorestore/user> ?agentId}}. }");
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
    	var trigs = t.createAnnoOAC([annoRec.data], t.annods, true, "triples");     	
    	var remid = annoRec.data.id;
    	
    	var xhr = new XMLHttpRequest();
    	
        xhr.open("PUT", this.reposURL + "/graph-store?graph=" + remid);
        
        var action = "create";
        
        theURL = this.reposURL + "/graph-store?graph=" + remid;
        xhr.onreadystatechange = function() {   
        	try {
	            if (xhr.readyState == 4) {
	                if (xhr.status == 200 || xhr.status == 201 || xhr.status == 204) {
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
        xhr.send(trigs);
    },
    /**
     * Delete the annotation
     * @param {String} id The URI of the annotation to remove 
     **/
    deleteAnnotation : function(id, success, failure, scope){
        Ext.Ajax.request({
            url: this.reposURL + "/graph-store?graph=" + id,
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
            method: "DELETE",
            scope: scope
        });
    },
    generateID : function() {
        return this.reposURL + this.unsavedSuffix;
    }
});