/*jslint nomen: true*/
/*global mx, mxui, mendix, dojo, require, console, define, module */
/*

	LazyReferenceSelector
	========================

	@file      : LazyReferenceSelector.js
	@version   : 1.0
	@author    : ...
	@date      : Tuesday, January 13, 2015
	@copyright : Mendix Technology BV
	@license   : Apache License, Version 2.0, January 2004

	Documentation
    ========================
	Describe your widget here.

*/

(function () {
    'use strict';

    // test
    require([

        'dojo/_base/declare', 'mxui/widget/_WidgetBase', 'dijit/_TemplatedMixin',
        'mxui/dom', 'dojo/dom', 'dojo/query', 'dojo/dom-prop', 'dojo/dom-geometry', 'dojo/dom-class', 'dojo/dom-style', 'dojo/on', 'dojo/_base/lang', 'dojo/text',
        'dojo/_base/array', 'dijit/form/DropDownButton', 'dijit/DropDownMenu', 'dijit/MenuItem',
        'dojo/text!LazyReferenceSelector/widget/template/LazyReferenceSelector.html'

    ], function (declare, _WidgetBase, _TemplatedMixin, domMx, dom, domQuery, domProp, domGeom, domClass, domStyle, on, lang, text, array, DropDownButton, DropDownMenu, MenuItem, widgetTemplate) {

        // Declare widget.
        return declare('LazyReferenceSelector.widget.LazyReferenceSelector', [_WidgetBase, _TemplatedMixin], {
            // Template path
            templateString: widgetTemplate,
            // Parameters configured in the Modeler.


            // General variables
            _wgtNode: null,
            _contextObj: null,
            _handles: null,

            // Extra variables
            _menu: null,
            _menuButton: null,
            _hasStarted: null,

            /**
             * Mendix Widget methods.
             * ======================
             */
            // dojo.declare.constructor is called to construct the widget instance. Implement to initialize non-primitive properties.
            constructor: function () {
                this._handles = [];
                this._hasStarted = false;
            },


            // dijit._WidgetBase.postCreate is called after constructing the widget. Implement to do extra setup work.
            postCreate: function () {
                // postCreate
                console.log('LazyReferenceSelector - postCreate');
                // To be able to just alter one variable in the future we set an internal variable with the domNode that this widget uses.
                this._wgtNode = this.domNode;

                this._setupEvents();

            },


            // mxui.widget._WidgetBase.update is called when context is changed or initialized. Implement to re-render and / or fetch data.
            update: function (obj, callback) {
                // startup
                console.log('LazyReferenceSelector - update');

                // Release handle on previous object, if any.
                if (this._handles) {
                    array.forEach(this._handles, function (handle, i) {
                        this.unsubscribe(handle);
                    });

                }

                if (obj === null) {
                    // Sorry no data no show!
                    console.log('LazyReferenceSelector  - update - We did not get any context object!');
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
                //TODO, clean up only events
                if (this._handles) {
                    array.forEach(this._handles, function (handle, i) {
                        this.unsubscribe(handle);
                    });
                }
            },


            /**
             * Extra setup widget methods.
             * ======================
             */


            // Attach events to newly created nodes.
            _setupEvents: function () {

                console.log('LazyReferenceSelector - setup events');

                this.connect(this.domNode, 'onclick', lang.hitch(this, function () {
                    if (dojo.query('.alert', this._wgtNode).length > 0) {
                        dojo.destroy(dojo.query('.alert', this._wgtNode)[0]);
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
                        attr: this.reference.split('/')[0],
                        callback: lang.hitch(this, function (obj, attr, value) {
                            if (value) {
                                this._setAsReference(value);
                            }

                            mx.data.get({
                                guid: value,
                                callback: lang.hitch(this, function (obj) {
                                    if (dojo.query('.alert', this._wgtNode).length > 0) {
                                        dojo.destroy(dojo.query('.alert', this._wgtNode)[0]);
                                    }
                                    this._menuButton.setLabel(obj.get(this.displayAttr));
                                })
                            });
                            this._execMf(this.onChangeMf);
                        })
                    }),
                    validationHandle = this.subscribe({
                        guid: this._contextObj.getGuid(),
                        val: true,
                        callback: lang.hitch(this, function (validations) {
                            var reason = validations[0].getReasonByAttribute(this.reference.split('/')[0]),
                                div = null;
                            // Reason should exist before we do anything within the browser.
                            if (reason) {
                                if (dojo.query('.alert', this._wgtNode).length > 0) {
                                    dojo.destroy(dojo.query('.alert', this._wgtNode)[0]);
                                }
                                div = dojo.create('div', {
                                    'class': 'alert alert-danger'
                                });
                                dojo.html.set(div, reason);
                                dojo.place(div, this._wgtNode, 'last');
                                validations[0].removeAttribute(this._contextObj);
                            }
                        })
                    });

                this._handles.push(subHandle);
                this._handles.push(refHandle);
                this._handles.push(validationHandle);
            },

            /**
             * Interaction widget methods.
             * ======================
             */

            _fetchItems: function () {
                console.log('LazyReferenceSelector - fetchItems');
                if (!this._hasStarted || this.refresh) {
                    if (this.xpathConstraint) {
                        console.log('LazyReferenceSelector - selection xpath defined');
                        //selection xpath defined
                        mx.data.get({
                            xpath: this.xpathConstraint,
                            callback: lang.hitch(this, function (objs) {
                                this._addMenuItems(objs);
                            })
                        });
                    } else if (this.mfSelector) {
                        console.log('LazyReferenceSelector - selection mf defined');
                        //selection mf defined
                        mx.data.action({
                            params: {
                                actionname: this.mfSelector
                            },
                            callback: lang.hitch(this, function (list) {
                                this._addMenuItems(list);
                            }),
                            error: function (error) {
                                console.log(error.description);
                            }
                        }, this);
                    } else {
                        //default fetch 
                        console.log('LazyReferenceSelector - default fetch');
                        var refEntity = this.reference.split('/')[1];
                        mx.data.get({
                            xpath: '//' + refEntity,
                            callback: lang.hitch(this, function (objs) {
                                this._addMenuItems(objs);
                            })
                        });
                    }
                } else {
                    //load the menu from cache
                    console.log('LazyReferenceSelector - loading from cache');
                }

            },


            _buildMenu: function () {
                console.log('LazyReferenceSelector - build menu');

                var referenceStr = this.reference.split('/')[0],
                    refguid = this._contextObj.getReference(referenceStr),
                    labelText = '',
                    self = this,
                    menuItem = null;

                //build the drop down
                this._menu = new DropDownMenu();
                //add empty menuitem
                menuItem = new MenuItem({
                    label: '',
                    onClick: function () {
                        //remove the reference object when the label is clicked
                        if (refguid) {
                            self._contextObj.removeReferences(referenceStr, [refguid]);
                            self._menuButton.setLabel('');
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


                //startup the menu
                this._menu.startup();

                //startup the menubutton;
                this._menuButton.startup();
                //empty the widget domnode
                dojo.empty(this._wgtNode);
                //attach it to the widget domnode
                this._wgtNode.appendChild(this._menuButton.domNode);
                domClass.add(this._menu.domNode, 'wgt-LazyReferenceSelector_dropdown');
            },

            _checkMenuItem: function (item) {
                //run a check to see if the item already exists (based on the label value)
                console.log('LazyReferenceSelector - check menu item');
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
                console.log('LazyReferenceSelector - create menu item');
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
                console.log('LazyReferenceSelector - create menu button with labeltext: ' + labelText);
                this._menuButton = new DropDownButton({
                    label: labelText,
                    name: this.id + '_name',
                    dropDown: this._menu,
                    id: this.id + '_dropdown',
                    'class': 'form-control'
                });
            },

            _setAsReference: function (guid) {
                console.log('LazyReferenceSelector - set as reference');
                var referenceStr = this.reference.split('/')[0];
                this._contextObj.addReference(referenceStr, guid);
            },

            _addMenuItems: function (items) {
                console.log('LazyReferenceSelector - add menu items');
                var self = this;
                array.forEach(items, function (item, i) {
                    self._checkMenuItem(item);
                });

                this._hasStarted = true;
            },

            _execMf: function (mf) {
                console.log('LazyReferenceSelector - execute mf');
                if (mf) {
                    mx.data.action({
                        params: {
                            actionname: mf
                        },
                        callback: lang.hitch(this, function () {
                            //ok
                        }),
                        error: function (error) {
                            console.log(error.description);
                        }
                    }, this);
                }
            },
			resize: function() {
		}
        });
    });

}());