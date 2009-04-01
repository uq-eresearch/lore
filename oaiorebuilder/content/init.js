/*
 * Copyright (C) 2008 - 2009 School of Information Technology and Electrical
 * Engineering, University of Queensland (www.itee.uq.edu.au).
 *  
 * This file is part of LORE. LORE was developed as part of the Aus-e-Lit project.
 *
 * LORE is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * LORE is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with LORE.  If not, see <http://www.gnu.org/licenses/>.
 */

var lorevisible;

// Global variables for accessing Ext components
var propertytabs;
var grid;
var aggregrid;
var nodegrid;
var lorestatus;
var loreviews;
var sourcestreeroot;
var annotationstreeroot;
var remstreeroot;
var welcometab;
var annotationstab;
var annotabsm;
var annotabds;
var annotationsform;
var compoundobjecttab;
var rdftab;
var summarytab;
var smiltab;
var currentURL;
var loadedURL;

// Global variables for graphical view
var oreGraph;
var oreGraphLookup = {};
var oreGraphModified = false;
var oreGraphCommandListener;
var oreGraphSelectionListener;
var selectedFigure; // last selected figure - updated by SelectionProperties.js
var dummylayoutx = 50;
var dummylayouty = 50;
var nodewidth = 220;
var nodeheight = 170;
var nodespacing = 40;
var maxx = 400;

// Global variables for relationship ontology
var onturl;
var ontrelationships;
var defaultCreator;

// repository access URLs
var reposURL; // compound object repository
var reposType; // type of compound object repository (eg sesame)
var annoURL; // annotation server

var annoMarker;

// properties that can be applied to aggregations, resource maps or aggregated
// resources
var metadata_props = ["dcterms:abstract", "dcterms:audience", "dc:creator",
		"dcterms:created", "dc:contributor", "dc:coverage", "dc:description",
		"dc:format", "dcterms:hasFormat", "dc:identifier", "dc:language",
		"dcterms:modified", "dc:publisher", "dc:rights", "dc:source",
		"dc:subject", "dc:title"];	
// properties that only make sense for aggregations
var aggre_metadata_props = ["ore:similarTo", "ore:isDescribedBy",
		"dcterms:references", "dcterms:replaces", "foaf:logo"];
// properties for aggregated resources (also populated from relationship
// ontology)
var resource_metadata_props = ["rdf:type", "ore:isAggregatedBy"];
var all_props = metadata_props.concat(aggre_metadata_props)
		.concat(resource_metadata_props);

var namespaces = {
	"dc" : "http://purl.org/dc/elements/1.1/",
	"dcterms" : "http://purl.org/dc/terms/",
	"ore" : "http://www.openarchives.org/ore/terms/",
	"foaf" : "http://xmlns.com/foaf/0.1/",
	"layout" : "http://maenad.itee.uq.edu.au/lore/layout.owl#"
};

// Extension 
const extid = "oaiorebuilder@maenad.itee.uq.edu.au";
var extension = Components.classes["@mozilla.org/extensions/manager;1"]
		.getService(Components.interfaces.nsIExtensionManager)
		.getInstallLocation(extid)
		.getItemLocation(extid);

function init(){
	
	var contentBox = window.parent.document.getElementById('oobContentBox');
	if (contentBox.getAttribute("collapsed") == "true") {
		lorevisible = false;
	} else {
		lorevisible = true;
	}
	propertytabs = Ext.getCmp("propertytabs");
	grid = Ext.getCmp("remgrid");
	//aggregrid = Ext.getCmp('aggregrid');
	nodegrid = Ext.getCmp('nodegrid');
	lorestatus = Ext.getCmp('lorestatus');
	rdftab = Ext.getCmp("remrdfview");
	rdftab.on("activate", showRDFHTML);
	annotationstab = Ext.getCmp("annotationslist");
	annotationsform = Ext.getCmp("annotationslistform").getForm();
	loreviews = Ext.getCmp("loreviews");
	welcometab = Ext.getCmp("welcome");
	summarytab = Ext.getCmp("remlistview");
	summarytab.on("activate", showCompoundObjectSummary);
	smiltab = Ext.getCmp("remsmilview");
	smiltab.on("activate",showSMIL);
	compoundobjecttab = Ext.getCmp("compoundobjecteditor");
	annotabsm = annotationstab.getSelectionModel();
	annotabsm.on('rowdeselect', function(sm, row, rec) {
		hideMarker();
		// update grid from form if it's a new annotation
		if (annotationsform.isDirty() && !rec.data.id){
			loreWarning("You haven't saved your new annotation!");
			annotationsform.updateRecord(rec);
		}
	});
	annotabsm.on('rowselect', function(sm, row, rec) {
		// load grid values into form
 		annotationsform.loadRecord(rec);
 		// add a marker to indicate context	
		if (rec.data.context) {
			var idx = rec.data.context.indexOf('#');
			var sel = getSelectionForXPath(rec.data.context.substring(idx + 1));
			annoMarker = decorate(sel, rec.data.id, rec.data.context, 'red');
		}
	});
	annotabds = annotationstab.getStore();
	var delannobtn = Ext.getCmp("delannobtn");
	var updannobtn = Ext.getCmp("updannobtn");
	var cancelupdbtn = Ext.getCmp("cancelupdbtn");
	var updctxtbtn = Ext.getCmp("updctxtbtn");
	var updrctxtbtn = Ext.getCmp("updrctxtbtn");
	
	cancelupdbtn.on('click', function(btn,e){
		// reset all annotation form items to empty
		annotationsform.items.each(function(item, index, len){item.reset();});
		annotabsm.clearSelections();
		
		// if this is a new annotation, delete the new template annotation
		var annoIndex = annotabds.findBy(function(record, id){
			return (!record.json.id);
		});
		if (annoIndex > 0){
			annotabds.remove(annotabds.getAt(annoIndex));
		}
		hideMarker();
	});
	
	updannobtn.on('click', function(btn,e){
		var annoID = annotationsform.findField('id').value;
		var annoIndex = annotabds.findBy(function(record, id){
			if (annoID) {
				return (annoID == record.json.id);
			}
			else {
				return (!record.json.id);
			}
		});
		// get the annotation contents
		var anno = annotabds.getAt(annoIndex);
		// update anno with properties from form
		annotationsform.updateRecord(anno);
		annotabds.commitChanges();
		var annoRDF = createAnnotationRDF(anno.data);
		if (!annoID){		
			// create new annotation
			var xhr = new XMLHttpRequest();
			xhr.open("POST",annoURL,true);
			xhr.setRequestHeader('Content-Type',  "application/rdf+xml");
			xhr.setRequestHeader('Content-Length', annoRDF.length);
			xhr.onreadystatechange = function(){
				if (xhr.readyState == 4) {
					if (xhr.status == 201) {
						loreInfo('Annotation created');
						updateSourceLists(currentURL);
						annotationsform.items.each(function(item, index, len){item.reset();});
						annotabsm.clearSelections();
					} else {
						loreInfo('Unable to create annotation: '+ xhr.statusText);
					}
				}
			};
			//alert(annoRDF);
			xhr.send(annoRDF);	
			annotabds.remove(anno);
		}
		else {
			// update existing annotation
			if (!annotationsform.isDirty()){
				loreInfo('Annotation content not modified: Annotation will not be updated');
				return;
			}
			// Update the annotation on the server via HTTP PUT
			var xhr = new XMLHttpRequest();
			xhr.open("PUT",annoID,true);
			xhr.setRequestHeader('Content-Type',  "application/xml");
			xhr.onreadystatechange = function(){
				if (xhr.readyState == 4) {
					if (xhr.status == 200) {
						loreInfo('Annotation updated');
					} else {
						loreInfo('Unable to update annotation: '+ xhr.statusText);
					}
				}
			};
			xhr.send(annoRDF);
		}
	});
	
	delannobtn.on('click', function(btn,e){
		try {
			// remove the annotation from the annotations tab
			var annoID = annotationsform.findField('id').value;
			var annoIndex = annotabds.findBy(function(record, id){
				if (annoID){
					return (annoID == record.json.id);
				} else {
					return (!record.json.id);
				}
			});
			annotabds.remove(annotabds.getAt(annoIndex));
			
			if (annoID){ // annoID is null if it's a new annotation
				// remove from the source tree
				annotationstreeroot.findChild('id',annoID).remove();
				// remove the annotation from the server
				Ext.Ajax.request({
					url: annoID,
					success: function(){
						loreInfo('Annotation deleted');
					},
					failure: function(){
						loreWarning('Unable to delete annotation');
					},
					method: "DELETE"
				});
			}
			annotationsform.items.each(function(item, index, len){item.reset();});
			annotabsm.clearSelections();
			hideMarker();
		} catch (ex){ loreWarning("Problems deleting annotation: " + ex.toString());}
	});

	updctxtbtn.on('click', function(btn, e){
			try {
				var currentCtxt = getXPathForSelection();
				var theField = annotationsform.findField('context');
				theField.setValue(currentCtxt);
				theField = annotationsform.findField('originalcontext');
				theField.setValue(currentCtxt);
				theField = annotationsform.findField('resource');
				theField.setValue(currentURL);
				theField = annotationsform.findField('original');
				theField.setValue(currentURL);
			} 
			catch (ex) {
				alert(ex.toString());
			}
	});
	updrctxtbtn.on('click', function(btn, e){
			try {
				var currentCtxt = getXPathForSelection();
				var theField = annotationsform.findField('revisedcontext');
				theField.setValue(currentCtxt);
				theField = annotationsform.findField('revised');
				theField.setValue(currentURL);
			} 
			catch (ex) {
				alert(ex.toString());
			}
	});
	var typecombo = Ext.getCmp("typecombo");
	setRevisionFormUI(false);
	Ext.getCmp("revisedfield").on('specialkey',function(field){
		launchWindow(field.value, true);
	});
	Ext.getCmp("originalfield").on('specialkey',function(field){
		launchWindow(field.value);
	});
	typecombo.on('valid', function( combo){
		var theVal = combo.getValue();
			if (theVal == 'Revision') {
				setRevisionFormUI(true);
			}
			else if (theVal == 'Comment'  || theVal =='Explanation'){
				setRevisionFormUI(false);
			}
	});	    	           					    
	sourcestreeroot = Ext.getCmp("sourcestree").getRootNode();
	annotationstreeroot = new Ext.tree.TreeNode({
		id: "annotationstree",
		text: "Annotations",
		draggable: false,
		iconCls: "tree-anno"
	});
	remstreeroot = new Ext.tree.TreeNode({
		id: "remstree",
		text: "Compound Objects",
		draggable: false,
		iconCls: "tree-ore"
	});
	recenttreeroot = new Ext.tree.TreeNode({
		id: "recenttree",
		text: "Recently opened",
		draggable: false,
		iconCls: "tree-ore"
	});
	_clearTree(sourcestreeroot);
	sourcestreeroot.appendChild(annotationstreeroot);
	sourcestreeroot.appendChild(remstreeroot);
	sourcestreeroot.appendChild(recenttreeroot);
	
	initProperties();
	initOntologies();
	initGraphicalView();

	nodegrid.on("propertychange", function(source, recid, newval, oldval) {
		// update the metadataproperties recorded in the figure for that node
		oreGraphModified = true;
		if (recid == 'Resource') {
			// the URL of the resource has changed
			if (newval && newval != '') {
				theval = newval
			} else
				theval = "about:blank";
				if (oreGraphLookup[theval]) {
				loreWarning("Cannot change resource URL: a node already exists for " + theval);
				selectedFigure.setContent("about:blank");
			} else {
				oreGraphLookup[theval] = selectedFigure.getId();
			}
			delete oreGraphLookup[oldval];
		}
		if (recid == 'dc:title'){
			// update figure title
			selectedFigure.setTitle(newval);
		}
		selectedFigure.updateMetadata(source);
	});
	
	grid.on("beforeedit",function(e){
		//don't allow these fields to be edited
		if(e.record.id == "ore:describes" || e.record.id == "rdf:type"){
			e.cancel = true;
		}
	});
	nodegrid.on("beforeedit", function(e){
		// don't allow format field to be edited
		if (e.record.id == "dc:format"){
			e.cancel = true;
		}
	});
	setUpMetadataMenu(grid, "grid"); 
	//setUpMetadataMenu(aggregrid, "aggregrid");
	setUpMetadataMenu(nodegrid,"nodegrid");
 	propertytabs.activate("remgrid");
	loreInfo("Welcome to LORE");
	this.currentURL = window.top.getBrowser().selectedBrowser.contentWindow.location.href;
	if(this.currentURL && this.currentURL != 'about:blank' 
		&& this.currentURL != '' && lorevisible){
		updateSourceLists(this.currentURL);
	}
	welcometab.body.update("<h1>LORE: Literature Object Re-use and Exchange</h1><p>For more information about LORE, please see the <a target='_blank' href='http://www.itee.uq.edu.au/~eresearch/projects/aus-e-lit/'>Aus-e-Lit</a> project page</p>");
	
  // 'Remind' Firefox to render the revision iframes
  // document.getElementById('revisionSourceFrame').src = document.getElementById('revisionSourceFrame').src;
  // document.getElementById('revisionTargetFrame').src = document.getElementById('revisionTargetFrame').src;
  
  setRevisionFrameURLs ("http://www.austlit.edu.au/common/loredemo/", "http://www.austlit.edu.au/common/loredemo/");
  // setTimeout('testParse()', REVISIONS_FRAME_LOAD_WAIT);
  // setTimeout('testRevisionMarkers()', REVISIONS_FRAME_LOAD_WAIT + 500);

  // setRevisionFrameURLs("about:blank","about:blank");
  
  var revisionsPanel = Ext.getCmp("revisionannotations");
  // alert(cmp.getSize().height);
  revisionsPanel.on("render", onRevisionsShow);
  revisionsPanel.on("show", onRevisionsShow);
  revisionsPanel.on("resize", onRevisionsShow);
	
	var revisionsListing = Ext.getCmp("revisionannotationlisting");
	revisionsListing.on("rowclick", onRevisionListingClick);
  onRevisionsShow(revisionsPanel);
  
  // setTimeout('testParse()', REVISIONS_FRAME_LOAD_WAIT);
}

function _make_menu_entry(menu, gridname, propname, op) {
	// helper function for setUpMetadataMenu
	var funcstr = "";
	funcstr += "var props = " + gridname + ".getSource();";
	if (op == "add") {
		funcstr += "if (props && !props[\"" + propname + "\"]){";
		funcstr += "props[\"" + propname + "\"] = \"\";";
	} else {
		funcstr += "if (props && typeof props[\"" + propname
				+ "\"] != \"undefined\"){";
		funcstr += "delete props[\"" + propname + "\"];";
	}
	funcstr += gridname + ".setSource(props);}";
	menu.add({
				id : menu.id + "-" + op + "-" + propname,
				text : propname,
				handler : new Function(funcstr)
			});
}
function setUpMetadataMenu(the_grid, gridname) {
	// create menu to add/remove additional metadata properties
	var addMetadataMenu = new Ext.menu.Menu({
				id : gridname + "-add-metadata-menu"
			});
	var remMetadataMenu = new Ext.menu.Menu({
				id : gridname + "-rem-metadata-menu"
			});
	for (var i = 0; i < metadata_props.length; i++) {
		_make_menu_entry(addMetadataMenu, gridname, metadata_props[i], "add");
		_make_menu_entry(remMetadataMenu, gridname, metadata_props[i], "rem");
	}
	if (gridname == "aggregrid") {
		for (var i = 0; i < aggre_metadata_props.length; i++) {
			_make_menu_entry(addMetadataMenu, gridname,
					aggre_metadata_props[i], "add");
			_make_menu_entry(remMetadataMenu, gridname,
					aggre_metadata_props[i], "rem");
		}
	}

	if (gridname == "nodegrid") {
		for (var i = 0; i < resource_metadata_props.length; i++) {
			_make_menu_entry(addMetadataMenu, gridname,
					resource_metadata_props[i], "add");
			_make_menu_entry(remMetadataMenu, gridname,
					resource_metadata_props[i], "rem");
		}
	}
	
	var tbar = the_grid.getTopToolbar();
	var addbtn = tbar[0];
	var rembtn = tbar[1];
	if (addbtn){
		addbtn.menu = addMetadataMenu;
	}
	if (rembtn){
		rembtn.menu = remMetadataMenu;
	}
}

function initOntologies(){
	/* Load domain ontology */
	ontrelationships = {};
	window.parent.oaiorebuilder.loadPrefs();
	loadRelationshipsFromOntology();
}

function initProperties(){
	// Initialise ORE properties
	var today = new Date();
	grid.setSource({
			"rdf:about" : "http://example.org/rem",
			"ore:describes" : "#aggregation",
			"dc:creator" : "",
			"dcterms:modified" : today,
			"dcterms:created" : today,
			"rdf:type" : "http://www.openarchives.org/ore/terms/ResourceMap"
	});
/*	aggregrid.setSource({
			"rdf:type" : "http://www.openarchives.org/ore/terms/Aggregation"
	});
*/
}
/**
 * Initialise the graphical view
 */
function initGraphicalView(){
	oreGraphLookup = {};
	if (oreGraph){
		oreGraph.getCommandStack().removeCommandStackEventListener(oreGraphCommandListener);
		oreGraph.removeSelectionListener(oreGraphSelectionListener);
		oreGraph.clear();
	} else {
		oreGraph = new draw2d.Workflow("drawingarea");
		oreGraph.scrollArea = document.getElementById("drawingarea").parentNode;
	}
	oreGraphSelectionListener = new oaiorebuilder.SelectionProperties(oreGraph);
	oreGraph.addSelectionListener(oreGraphSelectionListener);
	oreGraphCommandListener = new oaiorebuilder.CommandListener();
	oreGraph.getCommandStack().addCommandStackEventListener(oreGraphCommandListener);
	selectedFigure = null;
	dummylayoutx = 50;
	dummylayouty = 50;	
}



Ext.EventManager.onDocumentReady(init);


