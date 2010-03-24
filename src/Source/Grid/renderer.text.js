/**
 * Class: Jx.Grid.Renderer.Text
 * This is the default renderer for grid cells. It works the same as the 
 * original column implementation. It needs a store, a field name, and an 
 * optional formatter as well as other options.
 * 
 * Extends: <Jx.Grid.Renderer>
 * 
 */
Jx.Grid.Renderer.Text = new Class({
	
	Family: 'Jx.Grid.Renderer.Text',
	Extends: Jx.Grid.Renderer,
	
	options: {
        /**
         * Option: formatter
         * an instance of <Jx.Formatter> or one of its subclasses which
         * will be used to format the data in this column. It can also be
         * an object containing the name (This should be the part after
         * Jx.Formatter in the class name. For instance, to get a currency
         * formatter, specify 'Currency' as the name.) and options for the
         * needed formatter (see individual formatters for options).
         * (code)
         * {
         *    name: 'formatter name',
         *    options: {}
         * }
         * (end)
         */
        formatter: null,
        /**
         * Option: template
         * The template for rendering this cell. Will be processed as per
         * the Jx.Widget standard.
         */
        template: '<span class="jxGridCellContent"></span>',
        /**
         * Option: textTemplate
         * Will be used for creating the text that goes iside the template. Use
         * placeholders for indicating the field(s). You can add as much text 
         * as you want. for example, if you wanted to display someone's full 
         * name that is brokem up in the model with first and last names you 
         * can write a template like '{lastName}, {firstName}' and as long as 
         * the text between { and } are field names in the store they will be
         * substituted properly.
         */
        textTemplate: null,
        /**
         * Option: css
         * A string or function to use in adding classes to the text
         */
        css: null
	},
	
	store: null,
	
	columnsNeeded: null,
	
	classes: $H({
		domObj: 'jxGridCellContent'
	}),
	
	init: function () {
		this.parent();
		//check the formatter
		if ($defined(this.options.formatter)
                && !(this.options.formatter instanceof Jx.Formatter)) {
            var t = Jx.type(this.options.formatter);
            if (t === 'object') {
                this.options.formatter = new Jx.Formatter[this.options.formatter.name](
                        this.options.formatter.options);
            }
        }
	},
	
	setColumn: function (column) {
		this.parent();
		
		this.store = column.grid.getModel();
		
		if ($defined(this.options.textTemplate)) {
			this.columnsNeeded = this.store.parseTemplate(this.options.textTemplate);
		}
	},
	
	render: function () {
		this.parent();
		
		var text = '';
		if ($defined(this.options.textTemplate)) {
			text = this.store.fillTemplate(null,this.options.textTemplate,this.columnsNeeded);
		} 
		
        if ($defined(this.options.formatter)) {
            text = this.options.formatter.format(text);
        }
        
        this.domObj.set('html',text);
        
        if ($defined(this.options.css) && Jx.type(this.options.css) === 'function') {
        	this.domObj.addClass(this.options.css.run(text));
        } else if ($defined(this.options.css) && Jx.type(this.options.css) === 'string'){
        	this.domObj.addClass(this.options.css);
        }
        
	}
		
});