/*
 * Copyright (C) 2008 - 2010 School of Information Technology and Electrical
 * Engineering, University of Queensland (www.itee.uq.edu.au).
 * 
 * This file is part of LORE. LORE was developed as part of the Aus-e-Lit
 * project.
 * 
 * LORE is free software: you can redistribute it and/or modify it under the
 * terms of the GNU General Public License as published by the Free Software
 * Foundation, either version 3 of the License, or (at your option) any later
 * version.
 * 
 * LORE is distributed in the hope that it will be useful, but WITHOUT ANY
 * WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 * A PARTICULAR PURPOSE. See the GNU General Public License for more details.
 * 
 * You should have received a copy of the GNU General Public License along with
 * LORE. If not, see <http://www.gnu.org/licenses/>.
 */
/** 
 * Updates the properties views when nodes or connections are selected
 * @class lore.ore.graph.SelectionProperties
 */
lore.ore.graph.SelectionProperties=function(/*:workflow*/ workflow)
{
   this.workflow = workflow; 
}

lore.ore.graph.SelectionProperties.prototype.type="lore.ore.graph.SelectionProperties";
/**
 * Updates the proprties in the UI when the selection changes
 * @param {} figure
 */
lore.ore.graph.SelectionProperties.prototype.onSelectionChanged = function(/*:Figure*/figure){
	if (figure != null) {
		//lore.debug.ore("User selected figure in graph editor", figure);
		lore.ore.graph.selectedFigure = figure;
        lore.ore.ui.nodegrid.store.removeAll();
		if (figure.metadataproperties) {
            for (p in figure.metadataproperties){
                var pname = p;
                var pidx = p.indexOf("_");
                if (pidx != -1){
                    pname = p.substring(0,pidx);
                }
                //lore.ore.appendPropertyValue(p,figure.metadataproperties[p],lore.ore.ui.nodegrid);
                lore.ore.ui.nodegrid.store.loadData([{id: p, name: pname, value: figure.metadataproperties[p]}],true);
            }
            Ext.getCmp("propertytabs").activate("properties");
            lore.ore.ui.nodegrid.expand();
		}
		else if (figure.edgetype){
            lore.ore.ui.nodegrid.store.loadData([
                {name:'relationship',id:'relationship',value:figure.edgetype},
                {name: 'namespace', id: 'namespace', value:figure.edgens}
            ]);
            Ext.getCmp("propertytabs").activate("properties");
            lore.ore.ui.nodegrid.expand();
		}
	} else {
        delete lore.ore.graph.selectedFigure;
        lore.ore.ui.nodegrid.store.removeAll();
        lore.ore.ui.nodegrid.collapse();
	}
}