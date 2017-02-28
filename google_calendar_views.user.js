// ==UserScript==
// @name         Google Calendar Views
// @namespace    https://github.com/msmeeks
// @version      0.1
// @description  Add support to manage views (lists of calendars and display type) to Google Calendar
// @author       Michael Meeks
// @match        https://calendar.google.com/calendar*
// @require      https://ajax.googleapis.com/ajax/libs/jquery/3.1.1/jquery.min.js
// @grant        none
// ==/UserScript==

/* TODO:
 - Indicate whether or not a view is active - all calendars show and not others, all calendars show, some calendars show, no calendars shown?
 - Include the view type as part of the view (e.g. day, week, month, etc.)
 - Require confirmation to delete a view
 - Make views list share height like the calendar lists (no scrolling of the side bar when all are expanded)
*/

var run = function() {
    add_styles();

    var $views_panel = make_views_panel();
    $('#clst_my').before($views_panel);

    load_views();
};

CalendarHelper = {
    get_visible_calendars: function(calendars_to_ignore) {
        calendars_to_ignore = calendars_to_ignore || [];
        var ids_to_ignore = {};
        var num_calendars_to_ignore = calendars_to_ignore.length;
        for (var c = 0; c < num_calendars_to_ignore; c++) {
            var calendar_id = calendars_to_ignore[c].id || c;
            ids_to_ignore[calendar_id] = true;
        }

        var results = [];
        var calendars = $('.calListChip .calListLabel-sel');
        var count = calendars.length;
        for (var i = 0; i < count; i++) {
            var $calendar = $(calendars[i]);
            $calendar = $calendar.parents('.calListChip');
            var id = $calendar.attr('id');
            // If the calendar is not in the list of calendars to ignore, add it to the results
            if (!ids_to_ignore[id]) {
                var title = $calendar.attr('title');
                results.push({id: id, title: title});
            }
        }
        return results;
    },

    hide_all_calendars: function(calendars_to_ignore) {
        calendars_to_ignore = calendars_to_ignore || [];
        var calendars = CalendarHelper.get_visible_calendars(calendars_to_ignore);
        CalendarHelper.set_visibility_for_calendars(calendars, false);
    },

    set_visibility_for_calendars: function(calendars, should_be_visible) {
        var num_calendars = calendars.length;
        for(var i=0; i<num_calendars; i++) {
            var calendar_id = calendars[i].id || calendars[i];
            var $calendar = $('#' + calendar_id);
            var isSelected = $calendar.find('.calListLabel-sel').length > 0;
            if (isSelected != should_be_visible) {
                $calendar.click();
            }
        }
    }
};

MenuHelper = {

    make_menu_trigger: function(cfg) {
        var defaults = {
            menu: {
                items:[ {
                    text:'',
                    onClick: null
                } ]
            },
            onClick: null
        };
        cfg = $.extend({}, defaults, cfg);


        $trigger = $('<span class="clstMenu to-disable to-disable-tabindex" tabindex="0" role="menu" deluminate_imagetype="png">More options...</span>')
        .hover(function() {
            $(this).toggleClass('clstMenu-hover');
        });

        if (cfg.onClick) {
            $trigger.on('click', cfg.onClick);
        }

        $trigger.on('click', function(e) {
            $menu = MenuHelper.make_menu(cfg.menu);
            $('body').append($menu);
            MenuHelper.open_menu_on_target($menu, $(this));
            e.stopPropagation();
        });

        return $trigger;
    },

    make_menu_item: function(cfg) {
        var defaults = {
            text: '',
            onClick: null
        };
        cfg = $.extend({}, defaults, cfg);

        $item = $(
            '<div class="goog-menuitem" role="menuitem" style="user-select: none;">' +
                '<div class="goog-menuitem-content" style="user-select: none;">' +
                    cfg.text +
                '</div>' +
            '</div>'
        ).hover(function() {
            $(this).toggleClass('goog-menuitem-hover');
        });

        if (typeof cfg.onClick === 'function') {
            $item.on('click', function(e) {
                cfg.onClick(e);
            });
        }
        return $item;
    },

    make_menu_seperator: function() {
        return $('<div class="menu-separator">');
    },

    make_menu: function(cfg) {
        var defaults = {
            items:[ {
                text:'',
                onClick: null
            } ]
        };
        cfg = $.extend({}, defaults, cfg);

        var $items = $.map(cfg.items, function(item_cfg) {
            if (item_cfg == '-') {
                return MenuHelper.make_menu_seperator();
            } else {
                return MenuHelper.make_menu_item(item_cfg);
            }
        });

        var $menu = $('<div class="goog-menu goog-menu-vertical" role="menu" aria-haspopup="true" tabindex="0" style="user-select: none;">')
            .append($items);

        return $menu;
    },

    open_menu_on_target: function(menu, trigger) {
        var $menu = $(menu);
        var $target = $(trigger);

        var close_menu = function() {
            $menu.remove();
            $target.removeClass('clstMenu-open');
            $target.parent().removeClass('menu-open');
        };

        // Close menu when user clicks on an item
        var items = $menu.find('.goog-menuitem');
        var num_items = items.length;
        for(var i=0; i<num_items; i++) {
            $(items[0]).on('click', close_menu);
        }

        // Close other menus
        // TODO: see if there is a less hacky way to do this.
        $(document).click();

        // Close menu when user clicks off the trigger
        $(document).on('click', close_menu);

        if ($target.hasClass('clstMenu-open')) {
            // hide menu when user clicks the trigger and the menu is already visible
            close_menu();
        } else {
            var target_position = $target.offset();
            var x = target_position.left;
            var y = target_position.top + $target.height();
            $menu.css({top: y, left: x}).show();
            $target.addClass('clstMenu-open');
            $target.parent().addClass('menu-open');
        }
    }
};

ViewHelper = {
    
    create_or_update_view: function(name, calendars) {
        calendars = calendars || CalendarHelper.get_visible_calendars();

        var views = ViewHelper.get_views();
        var now = new Date();

        views[name] = {
            name: name,
            calendars: calendars,
            count: (views[name] && views[name].count) || 0,
            lastUsed: null,
            created: (views[name] && views[name].created) || now,
            modified: now
        };

        ViewHelper.set_views(views);
    },

    get_views: function() {
        return getValue('views', {});
    },

    set_views: function(views) {
        setValue('views', views);
    },

    get_view: function(name) {
        return ViewHelper.get_views()[name];
    },

    delete_view: function(name) {
        var views = ViewHelper.get_views();
        views[name] = undefined;
        ViewHelper.set_views(views);
    },

    activate_view: function(name) {
        var view = ViewHelper.get_view(name);
        CalendarHelper.hide_all_calendars(view.calendars);
        ViewHelper.show_view_calendars(view.name);
    },

    show_view_calendars: function(name) {
        var view = ViewHelper.get_view(name);
        CalendarHelper.set_visibility_for_calendars(view.calendars, true);
        ViewHelper.mark_view_used(view.name);
    },

    hide_view_calendars: function(name) {
        var view = ViewHelper.get_view(name);
        CalendarHelper.set_visibility_for_calendars(view.calendars, false);
    },

    mark_view_used: function(name) {
        // Update view metadata
        var views = getValue('views', {});
        views[name].count++;
        views[name].lastUsed = new Date();
        setValue('views', views);
    }
};

function make_create_view_form() {
    var $name = $('<input type="text" style="width:100px; margin:0 10px;" placeholder="Name"/>');
    var $save_btn = $('<a href="#" style="float:right;">Save View</a>');
    var $cancel_btn = $('<a href="#" style="float:left;">Cancel</a>');
    var $form = $('<div class="create-view-form" style="display:none; padding:5px 0;">New View:</div>');

    $form.append($name).append($cancel_btn).append($save_btn).append('<div style="clear:both">');

    $cancel_btn.on('click', function() {
        $form.hide();
    });

    $save_btn.on('click', function() {
        var name = $name.val();

        ViewHelper.create_or_update_view(name);

        load_views();

        $form.hide();
    });

    return $form;
}

function show_create_view_form() {
    $form = $('.create-view-form');
    $form.find('input').each(function() {
        $(this).val('');
    });

    $form.show();
}

function make_views_panel() {
    var $new_view_form = make_create_view_form();

    var $menu_trigger = MenuHelper.make_menu_trigger({
        isVisible: true,
        menu: {
            items: [{
                text: 'Create View',
                onClick: show_create_view_form
            }]
        }
    });

    var view_list_is_visible = getValue('view_list_is_visible', false);
    var expander_class = 'goog-zippy-collapsed';
    var list_display_style = 'none';
    if (view_list_is_visible) {
        expander_class = 'goog-zippy-expanded';
        list_display_style = '';
    }

    var $views_header = $(
        '<h2 class="calHeader goog-zippy-header ' + expander_class + '" tabindex="0" role="tab" aria-expanded="true">' +
            '<span class="h zippy-arrow" unselectable="on" deluminate_imagetype="png">&nbsp;</span>' +
            '<span class="calHeaderSpace">My Views</span>' +
        '</h2>'
    ).append($menu_trigger)
    .on('click', function() {
        $(this).toggleClass('goog-zippy-collapsed goog-zippy-expanded');
        $views_list.toggle();
        setValue('view_list_is_visible', !getValue('view_list_is_visible', false));
    });

    var $views_list = $('<div id="__view_list__">').css('display', list_display_style);

    var $views_panel = $('<div>').append($views_header).append($new_view_form).append($views_list);
    return $views_panel;
}

function make_button(button_text) {
    return $("<div>", {'class':'goog-imageless-button', 'role':'button'})
        .text(button_text)
        .hover(function() {
            $(this).toggleClass('goog-imageless-button-hover');
        });
}

function make_view_option(view) {
    $option = $(
        '<div class="calListRow" role="option" tabindex="0">' +
            '<div class="calListChip" title="' + view.name + '">' +
                '<div style="cursor:pointer;" class="calListLabelOuter">' +
                    '<div class="calListLabel">' +
                        '<div class="calListSquare goog-inline-block" style="background:#9FC6E7;border-color:#9FC6E7"> </div>' +
                        '<span style="">' +
                            truncate(view.name, 20) +
                        '</span>' +
                    '</div>' +
                '</div>' +
            '</div>' +
            '<div class="calListImg calListImg" id="popup-bW1lZWtzQHNhbGVzZm9yY2UuY29t" tabindex="-1"> </div>' +
        '</div>'
    ).on('click', function() {
        ViewHelper.activate_view(view.name);
    }).hover(function() {
        var $this = $(this);
        $this.find('.calListLabelOuter').toggleClass('calListLabelOuter-hvr');
        $this.toggleClass('calListRow-hover');
    });

    var $menu_trigger = MenuHelper.make_menu_trigger({
        menu: {
            items: [
                {
                    text: 'Activate View',
                    onClick: function() {
                        ViewHelper.activate_view(view.name);
                    }
                },
                {
                    text: 'Show Calendars',
                    onClick: function() {
                        ViewHelper.show_view_calendars(view.name);
                    }
                },
                {
                    text: 'Hide Calendars',
                    onClick: function() {
                        ViewHelper.hide_view_calendars(view.name);
                    }
                },
                '-',
                {
                    text: 'Update View',
                    onClick: function() {
                        ViewHelper.create_or_update_view(view.name);
                    }
                },
                {
                    text: 'Delete View',
                    onClick: function() {
                        ViewHelper.delete_view(view.name);
                        load_views();
                    }
                }
            ]
        }
    });

    $option.append($menu_trigger);

    return $option;
}

function load_views() {
    $view_list = $('#__view_list__');

    // Clear the views list
    $view_list.empty();

    // Add the current views
    var views = getValue('views', {});
    for (var key in views) {
        if (views.hasOwnProperty(key)) {
            $view_list.append(make_view_option(views[key]));
        }
    }
}

var add_styles = function() {
    // Add new CSS rules
    GM_addStyle('.calListRow .clstMenu { display: none; margin-top: -2px; }');
    GM_addStyle('.calListRow.calListRow-hover .clstMenu { display: inline-block; }');
    GM_addStyle('.calListRow .clstMenu.clstMenu-open { display: inline-block; }');
    GM_addStyle('.calListRow.menu-open .calListLabelOuter { background-color: #eee; }');
    GM_addStyle('.menu-separator { border-top: 1px solid #ebebeb; margin: 5px 0; }');
};

// String Helpers
var truncate = function(str, length, pruneStr) { //from underscore.string, author: github.com/rwz
      length = ~~length;
      pruneStr = pruneStr || '...';

      if (str.length <= length) return str;

      var tmpl = function(c){ return c.toUpperCase() !== c.toLowerCase() ? 'A' : ' '; },
        template = str.slice(0, length+1).replace(/.(?=\W*\w*$)/g, tmpl); // 'Hello, world' -> 'HellAA AAAAA'

      if (template.slice(template.length-2).match(/\w\w/))
        template = template.replace(/\s*\S+$/, '');
      else
        template = template.slice(0, template.length-1).trimRight();

      return (template + pruneStr).length > str.length ? str : str.slice(0, template.length) + pruneStr;
};

// Storage helpers
var account_email = $('[aria-label="Account Information"] > div > div > div:contains("@")').text();

const __STORAGE_PREFIX = [
    '', GM_info.script.namespace, GM_info.script.name, account_email, ''].join('___');

var setValue = function(key, value) {
    return SuperLocalStorage.set(__STORAGE_PREFIX + key, value);
};
var getValue = function(key, defaultValue) {
    return SuperLocalStorage.get(__STORAGE_PREFIX + key) || defaultValue;
};

/***************************************************************************************
****************************************************************************************
*****   Super LocalStorage
*****
*****   This library extends the  localStorage to handle any javascript variable type.
*****
*****   Usage:
*****       SuperLocalStorage.set(varName, varValue);
*****       var x = SuperLocalStorage.get(varName, defaultValue);
*****
*/

var SuperLocalStorage = new function () {

    var JSON_MarkerStr  = 'json_val: ';
    var FunctionMarker  = 'function_code: ';

    function ReportError (msg) {
        if (console && console.error)
            console.log (msg);
        else
            throw new Error (msg);
    }

    /*--- set ()
        Stores a value or function
        Parameters:
            varName
                String: The unique (within this script) name for this value.
                Should be restricted to valid Javascript identifier characters.
            varValue
                Any valid javascript value.  Just note that it is not advisable to
                store too much data in localStorage.
        Returns:
            undefined
    */
    this.set = function (varName, varValue) {
        if ( ! varName) {
            ReportError ('Illegal varName sent to SuperLocalStorage.set().');
            return;
        }

        switch (typeof varValue) {
            case 'undefined':
                ReportError ('Illegal varValue sent to SuperLocalStorage.set().');
                break;
            case 'boolean':
            case 'string':
            case 'number':
            case 'object':
                /*--- For all valid cases (but functions), and for store the value as a JSON string.
                */
                var safeStr = JSON_MarkerStr + JSON.stringify (varValue);
                localStorage.setItem(varName, safeStr);
                break;
            case 'function':
                /*--- Functions need special handling.
                */
                var safeStr = FunctionMarker + varValue.toString ();
                localStorage.setItem(varName, safeStr);
                break;

            default:
                ReportError ('Unknown type in SuperLocalStorage.set()!');
                break;
        }
    };//-- End of set()


    /*--- get ()
        This function extends that to allow retrieving any data type -- as
        long as it was stored with SuperLocalStorage.set().
        Parameters:
            varName
                String: The property name to get. See SuperLocalStorage.set for details.
            defaultValue
                Optional. Any value to be returned, when no value has previously
                been set.
        Returns:
            When this name has been set...
                The variable or function value as previously set.
            When this name has not been set, and a default is provided...
                The value passed in as a default
            When this name has not been set, and default is not provided...
                undefined
    */
    this.get = function (varName, defaultValue) {

        if ( ! varName) {
            ReportError ('Illegal varName sent to SuperLocalStorage.get().');
            return;
        }
        if (/[^\w _-]/.test (varName) ) {
            ReportError ('Suspect, probably illegal, varName sent to SuperLocalStorage.get().');
        }

        //--- Attempt to get the value from storage.
        var varValue    = localStorage.getItem(varName);
        if (!varValue)
            return defaultValue;

        //--- We got a value from storage. Now unencode it, if necessary.
        if (typeof varValue == "string") {
            //--- Is it a JSON value?
            var regxp       = new RegExp ('^' + JSON_MarkerStr + '(.+)$');
            var m           = varValue.match (regxp);
            if (m  &&  m.length > 1) {
                varValue    = JSON.parse ( m[1] );
                return varValue;
            }

            //--- Is it a function?
            var regxp       = new RegExp ('^' + FunctionMarker + '((?:.|\n|\r)+)$');
            var m           = varValue.match (regxp);
            if (m  &&  m.length > 1) {
                varValue    = eval ('(' + m[1] + ')');
                return varValue;
            }
        }

        return varValue;
    };//-- End of get()
};

//--- EOF for SuperLocalStorage


(function() {
    'use strict';

    run();
})();
