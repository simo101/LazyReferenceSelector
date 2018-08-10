define([
    "dojo/_base/declare",
    "mxui/widget/_WidgetBase",
    "mxui/dom",
    "dojo/dom",
    "dojo/query",
    "dojo/dom-prop",
    "dojo/dom-geometry",
    "dojo/dom-class",
    "dojo/dom-style",
    "dojo/on",
    "dojo/_base/lang",
    "dojo/text",
    "dojo/_base/array"
], function (declare, _WidgetBase, domMx, dom, domQuery, domProp, domGeom, domClass, domStyle, on, lang, text, array) {
    "use strict";
    // Declare widget.
    return declare("LazyReferenceSelector.widget.LazyReferenceSelector", [_WidgetBase], {

        // General variables
        _wgtNode: null,
        _contextObj: null,
        _handles: null,
        
        // Extra variables
        _menu: null,
        _menuButton: null,
        _hasStarted: null,
        _refguid: null,
        _referenceStr: null,

        constructor: function () {
            this._handles = [];
            this._hasStarted = false;
        },

        postCreate: function () {
            logger.debug(this.id + "LazyReferenceSelector - postCreate");

            this._wgtNode = this.domNode;
            this._wgtNode.className ="form-group lazyRefContainer";

            this.LazyReferenceSelectorNode = document.createElement("select");
            this.LazyReferenceSelectorNode.className = "form-control col-sm-8";


            if (this.showLabel) {
                this._label = document.createElement("label");
                this._label.className = "control-label checkboxLabel col-sm-4";
                this._label.innerHTML = this.fieldCaption;
                this._wgtNode.appendChild(this._label);
            }
            this._wgtNode.appendChild(this.LazyReferenceSelectorNode);

            this._setupEvents();

        },

        update: function (obj, callback) {
            // startup
            logger.debug(this.id + "LazyReferenceSelector - update");

            // Release handle on previous object, if any.
            if (obj === null) {
                // Sorry no data no show!
                logger.debug(this.id + "LazyReferenceSelector  - update - We did not get any context object!");
            } else {
                //set contextobject
                this._contextObj = obj;
                // Subscribe to object updates.
                this._resetSubsriptions();
                if(this._menu === null || ){
                    this._buildMenu();
                }
                
            }
            callback();
        },

        enable: function () {
            //TODO, what will happen if the widget is enabled (not visible).
        },

        disable: function () {
            //TODO, what will happen if the widget is disabled (set visible).
        },

        unintialize: function () {
            if (this._handles) {
                array.forEach(this._handles, function (handle, i) {
                    this.unsubscribe(handle);
                });
            }
        },

        _setupEvents: function () {
            logger.debug(this.id + "LazyReferenceSelector - setup events");

            this.connect(this.LazyReferenceSelectorNode, "onclick", lang.hitch(this, function () {
                if (dojo.query(".alert", this._wgtNode).length > 0) {
                    dojo.destroy(dojo.query(".alert", this._wgtNode)[0]);
                }
                this._fetchItems();
            }));

        },

        _resetSubsriptions: function () {
            this.unsubscribeAll();
        },

        _fetchItems: function () {
            if (!this._hasStarted || this.refresh) {
                if (window.device && window.mx.isOffline()) {
                    var refEntity = this.reference.split("/")[1];
                    console.log("Attribute "+this.offlineConstraint.split("=")[0]);
                    console.log("Value "+ this.offlineConstraint.split("=")[1].replace("'[%CurrentObject%]'",this._contextObj.getGuid()));
                    mx.data.getOffline(refEntity, [{
                        attribute: this.offlineConstraint.split("=")[0].trim(),
                        operator: "equals",
                        value: this.offlineConstraint.split("=")[1].replace("'[%CurrentObject%]'",this._contextObj.getGuid()).trim()// the guid of the owner, which is a Person entity
                      }], {}, lang.hitch(this, function(objs, count) {
                            this._addMenuItems(objs);
                      }));
                }else if (this.offlineConstraint){
                    logger.debug(this.id + "LazyReferenceSelector - selection xpath defined");
                    //selection xpath defined
                    var refEntity = this.reference.split("/")[1];
                    var constraint = "//" + refEntity + "[" + this.offlineConstraint.replace("'[%CurrentObject%]'",this._contextObj.getGuid()) + "]";
                    mx.data.get({
                        xpath: constraint,
                        callback: lang.hitch(this, function (objs) {
                            this._addMenuItems(objs);
                        })
                    });
                }
                else if (this.xpathConstraint) {
                    logger.debug(this.id + "LazyReferenceSelector - selection xpath defined");
                    //selection xpath defined
                    mx.data.get({
                        xpath: this.xpathConstraint,
                        callback: lang.hitch(this, function (objs) {
                            this._addMenuItems(objs);
                        })
                    });
                } else if (this.mfSelector) {
                    logger.debug(this.id + "LazyReferenceSelector - selection mf defined");
                    //selection mf defined
                    mx.data.action({
                        params: {
                            actionname: this.mfSelector
                        },
                        callback: lang.hitch(this, function (list) {
                            this._addMenuItems(list);
                        }),
                        error: function (error) {
                            logger.debug(this.id + error.description);
                        }
                    }, this);
                } else {
                    //default fetch
                    logger.debug(this.id + "LazyReferenceSelector - default fetch");
                    var refEntity = this.reference.split("/")[1];
                    mx.data.get({
                        xpath: "//" + refEntity,
                        callback: lang.hitch(this, function (objs) {
                            this._addMenuItems(objs);
                        })
                    });
                }
            } else {
                //load the menu from cache
                logger.debug(this.id + "LazyReferenceSelector - loading from cache");
            }
        },


        _buildMenu: function () {
            logger.debug(this.id + "LazyReferenceSelector - build menu");

            this._referenceStr = this.reference.split("/")[0];
            this._refguid = this._contextObj.getReference(this._referenceStr);
            var menuItem = null;
            logger.debug(this.id + "Lazy"+ this._referenceStr + "Lazy");
            //build the drop down
            this._menu = this.LazyReferenceSelectorNode;

            
            this._menu.onchange = lang.hitch(this,function(event){
                if(event.target.value != ""){
                    this._setAsReference(event.target.value);
                    if (dojo.query(".alert", this._wgtNode).length > 0) {
                        dojo.destroy(dojo.query(".alert", this._wgtNode)[0]);
                    }
                    this.onChangMf ? this._execMf(this.onChangeMf) : this._execNf(this.onChangeNf);
                } 
                else{
                    this._contextObj.removeReferences(this._referenceStr, [this._refguid]);
                    this.onChangMf ? this._execMf(this.onChangeMf) : this._execNf(this.onChangeNf);
                }
            });
            //add empty menuitem
            menuItem = document.createElement('option');
            menuItem.value = "";
            menuItem.innerHTML = "";
            this._menu.add(menuItem);


            // create default selection
            if (this._refguid) {
                mx.data.get({
                    guid: this._refguid,
                    callback: lang.hitch(this, function (obj) {
                        this._menu.value = this._checkMenuItem(obj).value;
                    })
                });

            }

        },

        _checkMenuItem: function (item) {
            //run a check to see if the item already exists (based on the label value)
            logger.debug(this.id + "LazyReferenceSelector - check menu item");
            var label = item.get(this.displayAttr),
                allItems = this._menu.options,
                containsItem = false;

            if (allItems.length > 1) {
                array.forEach(allItems, function (obj, i) {
                    if (obj.label === label) {
                        containsItem = true;
                    }
                });
            }

            if (!containsItem) {
                return this._createMenuItem(label, item);
            }
        },

        _createMenuItem: function (label, item) {
            //create a new dijit menu item
            logger.debug(this.id + "LazyReferenceSelector - create menu item");
            var menuItem = document.createElement('option');
            menuItem.value = item.getGuid();
            menuItem.innerHTML = label;

            this._menu.add(menuItem);
            return menuItem;
        },

        _setAsReference: function (guid) {
            logger.debug(this.id + "LazyReferenceSelector - set as reference");
            this._referenceStr = this.reference.split("/")[0];
            this._contextObj.addReference(this._referenceStr, guid);
        },

        _addMenuItems: function (items) {
            logger.debug(this.id + "LazyReferenceSelector - add menu items");
            var self = this;
            array.forEach(items, function (item, i) {
                self._checkMenuItem(item);
            });

            this._hasStarted = true;
        },

        _execMf: function (mf) {
            logger.debug(this.id + "LazyReferenceSelector - execute mf");
            if (mf) {
                mx.data.action({
                    params: {
                        actionname: mf
                    },
                    store: {
                        caller: this.mxform
                    },
                    callback: lang.hitch(this, function () {
                        //ok
                    }),
                    error: function (error) {
                        console.error(error.description);
                    }
                }, this);
            }
        },

        _execNf: function (nf) {
            logger.debug(this.id + "LazyReferenceSelector - execute mf");
            if (nf) {
                mx.data.callNanoflow({
                    nanoflow: nf,
                    orgin: this.mxform,
                    context:this.mxcontext,
                    callback: lang.hitch(this, function () {
                        //ok
                    }),
                    error: function (error) {
                        console.error(error.description);
                    }
                });
            }
        },

        resize: function() {}

    });
});

require(["LazyReferenceSelector/widget/LazyReferenceSelector"], function() {
    "use strict";
});
