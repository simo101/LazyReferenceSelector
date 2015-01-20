/*jslint nomen: true*/
/*global mx, mxui, mendix, dojo, require, console, define, module */
/**

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

        'mxui/widget/_WidgetBase', 'dijit/_Widget', 'dijit/_TemplatedMixin',
        'mxui/dom', 'dojo/dom', 'dojo/query', 'dojo/dom-prop', 'dojo/dom-geometry', 'dojo/dom-class', 'dojo/dom-style', 'dojo/on', 'dojo/_base/lang', 'dojo/_base/declare', 'dojo/text',
        'dojo/_base/array', 'dijit/form/DropDownButton', 'dijit/DropDownMenu', 'dijit/MenuItem'

    ], function (_WidgetBase, _Widget, _Templated, domMx, dom, domQuery, domProp, domGeom, domClass, domStyle, on, lang, declare, text, array, DropDownButton, DropDownMenu, MenuItem) {

        // Declare widget.
        return declare('LazyReferenceSelector.widget.LazyReferenceSelector', [_WidgetBase, _Widget, _Templated], {

            //Scoping variable
            _data: {},

            // Template path
            templatePath: require.toUrl('LazyReferenceSelector/widget/templates/LazyReferenceSelector.html'),

            /**
             * Mendix Widget methods.
             * ======================
             */

            // PostCreate is fired after the properties of the widget are set.
            postCreate: function () {

                // postCreate
                console.log('LazyReferenceSelector - postCreate');

                // Load CSS ... automaticly from ui directory

                // Setup widgets
                this._setupWidget();

                // Create childnodes
                this._createChildNodes();

                // Setup events
                this._setupEvents();

                // Show message
                this._showMessage();

            },

            // Startup is fired after the properties of the widget are set.
            startup: function () {

                // startup
                console.log('LazyReferenceSelector - startup');
            },

            /**
             * What to do when data is loaded?
             */

            update: function (obj, callback) {
                // startup
                console.log('LazyReferenceSelector - update');

                // Release handle on previous object, if any.
                if (this._data[this.id]._handles) {
                    array.forEach(this._data[this.id]._handles, function (handle, i) {
                        mx.data.unsubscribe(handle);
                    });

                }

                if (obj === null) {
                    // Sorry no data no show!
                    console.log('LazyReferenceSelector  - update - We did not get any context object!');
                } else {
                    //set contextobject
                    this._data[this.id]._contextObj = obj;
                    // Subscribe to object updates.
                    this._addSubscriptions();

                    this._buildMenu();
                }
                // Execute callback.
                if (typeof callback !== 'undefined') {
                    callback();
                }
            },

            /**
             * How the widget re-acts from actions invoked by the Mendix App.
             */
            suspend: function () {
                //TODO, what will happen if the widget is suspended (not visible).
            },

            resume: function () {
                //TODO, what will happen if the widget is resumed (set visible).
            },

            enable: function () {
                //TODO, what will happen if the widget is enabled (not visible).
            },

            disable: function () {
                //TODO, what will happen if the widget is disabled (set visible).
            },

            unintialize: function () {
                //TODO, clean up only events
                if (this._data[this.id]._handles) {
                    array.forEach(this._data[this.id]._handles, function (handle, i) {
                        mx.data.unsubscribe(handle);
                    });
                }
            },


            /**
             * Extra setup widget methods.
             * ======================
             */
            _setupWidget: function () {
                console.log('LazyReferenceSelector - setup widget');
                this._data[this.id] = {
                    // General variables
                    _wgtNode: null,
                    _contextObj: null,
                    _handles: [],

                    // Extra variables
                    _menu: null,
                    _menuButton: null,
                    _hasStarted: false
                };


                // To be able to just alter one variable in the future we set an internal variable with the domNode that this widget uses.
                this._data[this.id]._wgtNode = this.domNode;

            },

            // Create child nodes.
            _createChildNodes: function () {

                // Assigning externally loaded library to internal variable inside function.
                var $ = this.$;

                console.log('LazyReferenceSelector - createChildNodes events');
            },

            // Attach events to newly created nodes.
            _setupEvents: function () {

                console.log('LazyReferenceSelector - setup events');

                on(this.domNode, 'click', lang.hitch(this, function () {
                    this._fetchItems();
                }));

            },

            _addSubscriptions: function () {
                var subHandle = mx.data.subscribe({
                        guid: this._data[this.id]._contextObj.getGuid(),
                        callback: lang.hitch(this, function (guid) {
                            mx.data.get({
                                guid: guid,
                                callback: lang.hitch(this, function (obj) {
                                    // Set the object as background.
                                    this._data[this.id]._contextObj = obj;
                                })
                            });
                            this._execMf(this.onChangeMf);
                        })
                    }),
                    refHandle = mx.data.subscribe({
                        guid: this._data[this.id]._contextObj.getGuid(),
                        attr: this.reference.split('/')[0],
                        callback: lang.hitch(this, function (obj, attr, value) {
                            if (value) {
                                this._setAsReference(value);
                            }

                            mx.data.get({
                                guid: value,
                                callback: lang.hitch(this, function (obj) {
                                    this._data[this.id]._menuButton.setLabel(obj.get(this.displayAttr));
                                })
                            });
                            this._execMf(this.onChangeMf);
                        })
                    });

                this._data[this.id]._handles.push(subHandle);
                this._data[this.id]._handles.push(refHandle);
            },

            /**
             * Interaction widget methods.
             * ======================
             */

            _fetchItems: function () {
                console.log('LazyReferenceSelector - fetchItems');
                if (!this._data[this.id]._hasStarted || this.refresh) {
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
                    refguid = this._data[this.id]._contextObj.getReference(referenceStr),
                    labelText = '';

                //build the drop down
                this._data[this.id]._menu = new DropDownMenu();
                //add empty menuitem
                var self = this;
                var menuItem = new MenuItem({
                    label: '',
                    onClick: function () {
                        //remove the reference object when the label is clicked
                        if (refguid) {
                            self._data[self.id]._contextObj.removeReferences(referenceStr, [refguid]);
                            self._data[self.id]._menuButton.setLabel('');
                            self._execMf(self.onChangeMf);
                        }
                    }
                });
                this._data[this.id]._menu.addChild(menuItem);
                
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
                this._data[this.id]._menu.startup();
                
                //startup the menubutton;
                this._data[this.id]._menuButton.startup();
                //empty the widget domnode
                dojo.empty(this._data[this.id]._wgtNode);
                //attach it to the widget domnode
                this._data[this.id]._wgtNode.appendChild(this._data[this.id]._menuButton.domNode);
                domClass.add(this._data[this.id]._menu.domNode, 'wgt-LazyReferenceSelector_dropdown');
            },

            _checkMenuItem: function (item) {
                //run a check to see if the item already exists (based on the label value)
                console.log('LazyReferenceSelector - check menu item');
                var label = item.get(this.displayAttr),
                    allItems = this._data[this.id]._menu.getChildren(),
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
                            self._data[self.id]._menuButton.setLabel(item.get(self.displayAttr));
                        }
                    });
                this._data[this.id]._menu.addChild(menuItem);
            },

            _createMenuButton: function (labelText) {
                console.log('LazyReferenceSelector - create menu button with labeltext: ' + labelText);
                this._data[this.id]._menuButton = new DropDownButton({
                    label: labelText,
                    name: this.id + '_name',
                    dropDown: this._data[this.id]._menu,
                    id: this.id + '_dropdown',
                    class: 'form-control'
                });
            },

            _setAsReference: function (guid) {
                console.log('LazyReferenceSelector - set as reference');
                var referenceStr = this.reference.split('/')[0];
                this._data[this.id]._contextObj.addReference(referenceStr, guid);
            },

            _addMenuItems: function (items) {
                console.log('LazyReferenceSelector - add menu items');
                var self = this;
                array.forEach(items, function (item, i) {
                    self._checkMenuItem(item);
                });

                this._data[this.id]._hasStarted = true;
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
            }
        });
    });

}());