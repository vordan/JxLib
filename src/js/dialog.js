// $Id: dialog.js 1154 2008-09-25 18:56:07Z pspencer $
/**
 * Class: Jx.Dialog
 * A Jx.Dialog implements a floating dialog.  Dialogs represent a useful way
 * to present users with certain information or application controls.
 * Jx.Dialog is designed to provide the same types of features as traditional
 * operating system dialog boxes, including:
 *
 * - dialogs may be modal (user must dismiss the dialog to continue) or 
 * non-modal
 *
 * - dialogs are movable (user can drag the title bar to move the dialog
 * around)
 *
 * - dialogs may be a fixed size or allow user resizing.
 *
 * Jx.Dialog uses <Jx.ContentLoader> to load content into the content area
 * of the dialog.  Refer to the <Jx.ContentLoader> documentation for details
 * on content options.
 *
 * Example:
 * (code)
 * var dialog = new Jx.Dialog();
 * (end)
 *
 * Events:
 * open - triggered when the dialog is opened
 * close - triggered when the dialog is closed
 * change - triggered when the value of an input in the dialog is changed
 * resize - triggered when the dialog is resized
 *
 * Extends:
 * <Jx.Panel>
 *
 * Implements:
 * <Jx.AutoPosition>
 *
 * License: 
 * Copyright (c) 2008, DM Solutions Group Inc.
 * 
 * This file is licensed under an MIT style license
 */
Jx.Dialog = new Class({
    Extends: Jx.Panel,
    Implements: [Jx.AutoPosition, Jx.Chrome],
    
    /**
     * Property: {HTMLElement} blanket
     * modal dialogs prevent interaction with the rest of the application
     * while they are open, this element is displayed just under the
     * dialog to prevent the user from clicking anything.
     */
    blanket: null,
    
    options: {
        modal: true,
        position: 'absolute',
        width: 250,
        height: 250,
        horizontal: 'center center',
        vertical: 'center center',
        label: 'New Dialog',
        id: '',
        parent: null,
        resize: false,
        move: true,
        close: true,
        collapse: true
    },
    /**
     * Constructor: Jx.Dialog
     * Construct a new instance of Jx.Dialog
     *
     * Parameters: 
     * options - {Object} an object containing options for the dialog.
     *
     * Options:
     * modal - (optional) {Boolean} controls whether the dialog will be modal
     *    or not.  The default is to create modal dialogs.
     * horizontal - (optional) {String} the horizontal rule for positioning the
     *    dialog.  The default is 'center center' meaning the dialog will be
     *    centered on the page.  See {<Jx.AutoPosition>} for details.
     * vertical - (optional) {String} the vertical rule for positioning the
     *    dialog.  The default is 'center center' meaning the dialog will be
     *    centered on the page.  See {<Jx.AutoPosition>} for details.
     * width - (optional) {Integer} the initial width in pixels of the dialog.
     *    The default value is 250 if not specified.
     * height - (optional) {Integer} the initial height in pixels of the 
     *    dialog. The default value is 250 if not specified.
     * label - (optional) {String} the title of the dialog box.  "New Dialog"
     *    is the default value.
     * content - (optional) {Mixed} passed to <Jx.ContentLoader> for loading
     *    dialog content.
     * contentURL - (optional) {String} passed to <Jx.ContentLoader> for loading
     *    dialog content.
     * id - (optional) {String} an HTML ID to assign to the dialog, primarily
     *    used for applying CSS styles to specific dialogs
     * parent - (optional) {HTMLElement} a reference to an HTML element that
     *    the dialog is to be contained by.  The default value is for the dialog
     *    to be contained by the body element.
     * resize - (optional) {Boolean} determines whether the dialog is
     *    resizeable by the user or not.  Default is false.
     * move - (optional) {Boolean} determines whether the dialog is
     *    moveable by the user or not.  Default is true.
     */
    initialize: function(options) {
        /* initialize class-wide singleton that holds the current z-order
         * of all dialogs
         */
        if (!Jx.Dialog.Stack) {
            Jx.Dialog.Stack = [];
            Jx.Dialog.ZIndex = [100];
        }
        
        this.isOpening = false;
        this.firstShow = true;
        
        /* ugly hack around $unlink in mootools */
        var content = null;
        if (options && options.content) {
            content = options.content;
            options.content = null;
        }
        
        /* initialize the panel overriding the type and position */
        this.parent($merge(
            {parent:document.body}, // these are defaults that can be overridden
            options,
            {type:'Dialog', position: 'absolute'} // these override anything passed to the options
        ));
        
        /* ugly hack continued */
        this.options.content = content;
        this.loadContent(this.content);

        this.options.parent = $(this.options.parent);
        
        if (!window.opera && this.options.modal) {
            this.blanket = new Element('div',{
                'class':'jxDialogModal',
                styles:{
                    display:'none',
                    zIndex: -1
                }
            });
        
            this.options.parent.adopt(this.blanket);
            (new Jx.Layout(this.blanket)).resize();
        }

        this.domObj.setStyle('display','none');
        this.options.parent.adopt(this.domObj);
        
        /* the dialog is moveable by its title bar */
        if (this.options.move) {
            this.title.addClass('jxDialogMoveable');
            new Drag(this.domObj, {
                handle: this.title,
                onBeforeStart: (function(){
                    Jx.Dialog.Stack.erase(this).push(this);
                    Jx.Dialog.Stack.each(function(d, i) {
                        d.domObj.setStyle('zIndex',101+i);
                    });
                }).bind(this),
                onStart: (function() {
                    this.contentContainer.setStyle('visibility','hidden');
                    this.chrome.addClass('jxChromeDrag');
                }).bind(this),
                onComplete: (function() {
                    this.chrome.removeClass('jxChromeDrag');
                    this.contentContainer.setStyle('visibility','');
                    var left = Math.max(this.chromeOffsets.left, parseInt(this.domObj.style.left));
                    var top = Math.max(this.chromeOffsets.top, parseInt(this.domObj.style.top));
                    this.options.horizontal = left + ' left';
                    this.options.vertical = top + ' top';
                    this.position(this.domObj, this.options.parent, this.options);
                    this.options.left = parseInt(this.domObj.style.left);
                    this.options.top = parseInt(this.domObj.style.top);
                    if (!this.options.closed) {
                        this.domObj.resize(this.options);                        
                    }
                }).bind(this)
            });            
        }
        
        /* the dialog is resizeable */
        if (this.options.resize) {
            this.resizeHandle = new Element('div', {
                'class':'jxDialogResize',
                styles: {
                    'display':this.options.closed?'none':'block'
                }
            });
            this.domObj.appendChild(this.resizeHandle);

            this.resizeHandleSize = this.resizeHandle.getSize(); 
            this.resizeHandle.setStyles({
                bottom: this.resizeHandleSize.height,
                right: this.resizeHandleSize.width
            });
            this.domObj.makeResizable({
                handle:this.resizeHandle,
                onStart: (function() {
                    this.contentContainer.setStyle('visibility','hidden');
                    this.chrome.addClass('jxChromeDrag');
                }).bind(this),
                onComplete: (function() {
                    this.chrome.removeClass('jxChromeDrag');
                    var size = this.domObj.getMarginBoxSize();
                    this.options.width = size.width;
                    this.options.height = size.height;
                    this.layoutContent();
                    this.domObj.resize(this.options);
                    this.contentContainer.setStyle('visibility','');
                    this.fireEvent('resize');
                }).bind(this)
            });
        }
        /* this adjusts the z-index of the dialogs when activated */
        this.domObj.addEvent('mousedown', (function(){
            Jx.Dialog.Stack.erase(this).push(this);
            Jx.Dialog.Stack.each(function(d, i) {
                d.domObj.setStyle('zIndex',101+i);
            });
        }).bind(this));
    },
    
    /**
     * Method: sizeChanged
     * overload panel
     */
    sizeChanged: function() {
        if (!this.options.closed) {
            this.layoutContent();
        }
    },
    
    /**
     * Method: toggleCollapse
     * sets or toggles the collapsed state of the panel.  If a
     * new state is passed, it is used, otherwise the current
     * state is toggled.    
     *
     * Parameters:
     * state - optional, if passed then the state is used, 
     * otherwise the state is toggled.
     */
    toggleCollapse: function(state) {
        if ($defined(state)) {
            this.options.closed = state;
        } else {
            this.options.closed = !this.options.closed;
        }
        if (this.options.closed) {
            if (!this.domObj.hasClass('jx'+this.options.type+'Min')) {
                this.domObj.addClass('jx'+this.options.type+'Min');
            }
            this.contentContainer.setStyle('display','none');
            if (this.resizeHandle) {
                this.resizeHandle.setStyle('display','none');
            }
        } else {
            if (this.domObj.hasClass('jx'+this.options.type+'Min')) {
                this.domObj.removeClass('jx'+this.options.type+'Min');
            }
            this.contentContainer.setStyle('display','block');
            if (this.resizeHandle) {
                this.resizeHandle.setStyle('display','block');
            }
        }
        
        if (this.options.closed) {
            var margin = this.domObj.getMarginSize();
            var size = this.title.getMarginBoxSize();
            this.domObj.resize({height: margin.top + size.height + margin.bottom});
            this.fireEvent('collapse');
        } else {
            this.domObj.resize(this.options);
            this.fireEvent('expand');
        }
    },
    
    /**
     * Method: setTitle
     * set the text of the dialog title.
     *
     * Parameters: 
     * title - {String} the new title
     */
    setTitle: function( title ) {
        this.title.childNodes[0].innerHTML = title;
    },

    /**
     * Method: show
     * show the dialog
     */
    show : function( ) {
        /* get the z-index right */
        Jx.Dialog.Stack.push(this);
        /* do the modal thing */
        if (this.options.modal) {
            this.blanket.setStyles({
                zIndex: Jx.Dialog.ZIndex[0]++,
                visibility: 'visible',
                display: 'block'
            });
        }
        /* display the dialog */
        this.domObj.setStyles({
            'zIndex': Jx.Dialog.ZIndex[0]++,
            'display': 'block',
            'visibility': 'hidden'
        });
        if (this.options.closed) {
            var margin = this.domObj.getMarginSize();
            var size = this.title.getMarginBoxSize();
            this.domObj.resize({height: margin.top + size.height + margin.bottom});
        } else {
            this.domObj.resize(this.options);            
        }
        if (this.firstShow) {
            this.contentContainer.resize({forceResize: true});
            this.layoutContent();
            this.firstShow = false;
        }
        /* update or create the chrome */
        this.showChrome(this.domObj);
        /* put it in the right place using auto-positioning */
        this.position(this.domObj, this.options.parent, this.options);
        this.domObj.setStyle('visibility', '');
    },
    /**
     * Method: hide
     * hide the dialog
     */
    hide : function() {
        Jx.Dialog.Stack.erase(this);
        Jx.Dialog.ZIndex[0]--;
        this.domObj.setStyle('display','none');
        if (this.options.modal) {
            this.blanket.setStyle('visibility', 'hidden');
            Jx.Dialog.ZIndex[0]--;
        }
        
    },
    /**
     * Method: open
     * open the dialog.  This may be delayed depending on the 
     * asynchronous loading of dialog content.  The onOpen
     * callback function is called when the dialog actually
     * opens
     */
    open: function() {
        if (!this.isOpening) {
            this.isOpening = true;
        }
        if (this.contentIsLoaded) {
            this.show();
            this.fireEvent('open', this);
            this.isOpening = false;
        }
    },
    /**
     * Method: close
     * close the dialog and trigger the onClose callback function
     * if necessary
     */
    close: function() {
        this.isOpening = false;
        this.hide();
        this.fireEvent('close');
    },
    /**
     * Method: onContentLoaded
     * handle the dialog content being loaded.  This triggers
     * processing of inputs and the onContentLoaded callback
     * function (if necessary).  Also, if the dialog was previously
     * requested to be opened, this will actually open it.
     */
    onContentLoaded : function() {
        if (this.isOpening) {
            this.open();
        }
    }
});
