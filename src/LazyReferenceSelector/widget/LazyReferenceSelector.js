define([
    "dojo/_base/declare",
    "mxui/widget/_WidgetBase",
    "dijit/_TemplatedMixin",
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
    "dojo/_base/array",
    "dijit/form/DropDownButton",
    "dijit/DropDownMenu",
    "dijit/MenuItem",
    "dojo/text!LazyReferenceSelector/widget/template/LazyReferenceSelector.html"
], function (declare, _WidgetBase, _TemplatedMixin, domMx, dom, domQuery, domProp, domGeom, domClass, domStyle, on, lang, text, array, DropDownButton, DropDownMenu, MenuItem, widgetTemplate) {
    "use strict";

    // Declare widget.
    return declare("LazyReferenceSelector.widget.LazyReferenceSelector", [_WidgetBase, _TemplatedMixin], {

        // Template path
        templateString: widgetTemplate,

        // General variables
        _wgtNode: null,
        _contextObj: null,
        _handles: null,

        // Extra variables
        _menu: null,
        _menuButton: null,
        _hasStarted: null,

        constructor: function () {
            this._handles = [];
            this._hasStarted = false;
        },

        postCreate: function () {
            logger.debug(this.id + "LazyReferenceSelector - postCreate");
            this._wgtNode = this.LazyReferenceSelectorNode;

            if (this.showLabel) {
            this.checkboxLabel.innerHTML = this.fieldCaption;
            }
            this._setupEvents();

        },

        update: function (obj, callback) {
            // startup
            logger.debug(this.id + "LazyReferenceSelector - update");

            // Release handle on previous object, if any.
            if (this._handles) {
                array.forEach(this._handles, function (handle, i) {
                    this.unsubscribe(handle);
                });

            }

            if (obj === null) {
                // Sorry no data no show!
                logger.debug(this.id + "LazyReferenceSelector  - update - We did not get any context object!");
            } else {
                //set contextobject
                this._contextObj = obj;
                // Subscribe to object updates.
                this._addSubscriptions();

                this._buildMenu();
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

            this.connect(this.domNode, "onclick", lang.hitch(this, function () {
                if (dojo.query(".alert", this._wgtNode).length > 0) {
                    dojo.destroy(dojo.query(".alert", this._wgtNode)[0]);
                }
                this._fetchItems();
            }));

        },

        _addSubscriptions: function () {
            var subHandle = this.subscribe({
                    guid: this._contextObj.getGuid(),
                    callback: lang.hitch(this, function (guid) {
                        mx.data.get({
                            guid: guid,
                            callback: lang.hitch(this, function (obj) {
                                // Set the object as background.
                                this._contextObj = obj;
                            })
                        });
                        this._execMf(this.onChangeMf);
                    })
                }),
                refHandle = this.subscribe({
                    guid: this._contextObj.getGuid(),
                    attr: this.reference.split("/")[0],
                    callback: lang.hitch(this, function (obj, attr, value) {
                        if (value) {
                            this._setAsReference(value);
                            mx.data.get({
                                guid: value,
                                callback: lang.hitch(this, function (obj) {
                                    if (dojo.query(".alert", this._wgtNode).length > 0) {
                                        dojo.destroy(dojo.query(".alert", this._wgtNode)[0]);
                                    }
                                    this._menuButton.setLabel(obj.get(this.displayAttr));
                                })
                            });
                            this._execMf(this.onChangeMf);
                        }
                    })
                }),
                validationHandle = this.subscribe({
                    guid: this._contextObj.getGuid(),
                    val: true,
                    callback: lang.hitch(this, function (validations) {
                        var reason = validations[0].getReasonByAttribute(this.reference.split("/")[0]),
                            div = null;
                        // Reason should exist before we do anything within the browser.
                        if (reason) {
                            if (dojo.query(".alert", this._wgtNode).length > 0) {
                                dojo.destroy(dojo.query(".alert", this._wgtNode)[0]);
                            }
                            div = dojo.create("div", {
                                "class": "alert alert-danger"
                            });
                            dojo.html.set(div, reason);
                            dojo.place(div, this._wgtNode, "last");
                            validations[0].removeAttribute(this._contextObj);
                        }
                    })
                });

            this._handles.push(subHandle);
            this._handles.push(refHandle);
            this._handles.push(validationHandle);
        },

        _fetchItems: function () {
            logger.debug(this.id + "LazyReferenceSelector - fetchItems");
            if (!this._hasStarted || this.refresh) {
                if (this.xpathConstraint) {
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

            var referenceStr = this.reference.split("/")[0],
                refguid = this._contextObj.getReference(referenceStr),
                labelText = "",
                self = this,
                menuItem = null;
            logger.debug(this.id + "Lazy"+ referenceStr + "Lazy");
            //build the drop down
            this._menu = new DropDownMenu();
            //add empty menuitem
            menuItem = new MenuItem({
                label: "",
                onClick: function () {
                    //remove the reference object when the label is clicked
                    if (refguid) {
                        self._contextObj.removeReferences(referenceStr, [refguid]);
                        self._menuButton.setLabel("");
                        self._execMf(self.onChangeMf);
                    }
                }
            });

            this._menu.addChild(menuItem);

            //create the menubutton
            if (refguid) {

                mx.data.get({
                    guid: refguid,
                    callback: lang.hitch(this, function (obj) {
                        labelText = obj.get(this.displayAttr);
                        this._createMenuButton(labelText);
                    })
                });

            } else {
                this._createMenuButton(labelText);
            }

        },

        _checkMenuItem: function (item) {
            //run a check to see if the item already exists (based on the label value)
            logger.debug(this.id + "LazyReferenceSelector - check menu item");
            var label = item.get(this.displayAttr),
                allItems = this._menu.getChildren(),
                containsItem = false;

            if (allItems.length > 1) {
                array.forEach(allItems, function (obj, i) {
                    if (obj.label === label) {
                        containsItem = true;
                    }
                });
            }

            if (!containsItem) {
                this._createMenuItem(label, item);
            }
        },

        _createMenuItem: function (label, item) {
            //create a new dijit menu item
            logger.debug(this.id + "LazyReferenceSelector - create menu item");
            var self = this,
                menuItem = new MenuItem({
                    label: label,
                    onClick: function () {
                        //set the reference object when the label is clicked
                        self._setAsReference(item.getGuid());
                        self._menuButton.setLabel(item.get(self.displayAttr));
                    }
                });
            this._menu.addChild(menuItem);
        },

        _createMenuButton: function (labelText) {
            logger.debug(this.id + "LazyReferenceSelector - create menu button with labeltext: " + labelText);
            this._menuButton = new DropDownButton({
                label: labelText,
                name: this.id + "_name",
                dropDown: this._menu,
                id: this.id + "_dropdown",
                "class": "form-control"
            });
            logger.debug(this.id + "Lazy" + this._menuButton+" labeltext: "+ labelText);

            //startup the menu
            this._menu.startup();

            //startup the menubutton;
            this._menuButton.startup();

            //empty the widget domnode
            dojo.empty(this._wgtNode);
            //attach it to the widget domnode
            this._wgtNode.appendChild(this._menuButton.domNode);
            domClass.add(this._menu.domNode, "wgt-LazyReferenceSelector_dropdown");
        },

        _setAsReference: function (guid) {
            logger.debug(this.id + "LazyReferenceSelector - set as reference");
            var referenceStr = this.reference.split("/")[0];
            this._contextObj.addReference(referenceStr, guid);
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

        resize: function() {}

    });
});

require(["LazyReferenceSelector/widget/LazyReferenceSelector"], function() {
    "use strict";
});
