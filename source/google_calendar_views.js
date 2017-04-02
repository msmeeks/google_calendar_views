/* TODO:
 - Indicate whether or not a view is active - all calendars show and not others, all calendars show, some calendars show, no calendars shown?
 - Include the view type as part of the view (e.g. day, week, month, etc.)
 - Require confirmation to delete a view
 - Make views list share height like the calendar lists (no scrolling of the side bar when all are expanded)
 - Undo/Redo changes to the view
*/

var run = function() {
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
    },

	show_only_specified_calendars: function(calendars) {
		CalendarHelper.hide_all_calendars(calendars);
		CalendarHelper.set_visibility_for_calendars(calendars);
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
		StateHelper.record_current_state();

        CalendarHelper.show_only_specified_calendars(view.calendars);
        ViewHelper.mark_view_used(view.name);
    },

    show_view_calendars: function(name) {
        var view = ViewHelper.get_view(name);
		StateHelper.record_current_state();

        CalendarHelper.set_visibility_for_calendars(view.calendars, true);
        ViewHelper.mark_view_used(view.name);
    },

    hide_view_calendars: function(name) {
        var view = ViewHelper.get_view(name);
		StateHelper.record_current_state();

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

StateHelper = {
	states: [],
	index: -1,

	record_current_state: function() {
		var current_calendars = CalendarHelper.get_visible_calendars();
		var current_state = {
			name: new Date(),
			calendars: current_calendars
		};

		// Truncate states if some states have been undone before recording the current state
		if (StateHelper.index + 1 < StateHelper.states.length) {
			StateHelper.states = StateHelper.states.slice(StateHelper.index + 1);
		}

		StateHelper.states.push(current_state);
		StateHelper.index++;
	},

	set_state: function(index) {
		if (index <= 0 || index > StateHelper.states.length - 1) {
			return false;
		}

		StateHelper.index = index;
        CalendarHelper.show_only_specified_calendars(StateHelper.states[index].calendars);
	},

	undo: function() {
		StateHelper.set_state(StateHelper.index - 1);
	},

	redo: function() {
		StateHelper.set_state(StateHelper.index + 1);
	}
}

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
            items: [
				{
					text: 'Undo',
					onClick: StateHelper.undo
				},
				{
					text: 'Redo',
					onClick: StateHelper.redo
				},
				{
					text: 'Create View',
					onClick: show_create_view_form
				}
			]
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

const __STORAGE_PREFIX = 'https://github.com/msmeeks___google_calendar_views___' + account_email + "___";

var setValue = function(key, value) {
    return SuperLocalStorage.set(__STORAGE_PREFIX + key, value);
};
var getValue = function(key, defaultValue) {
    return SuperLocalStorage.get(__STORAGE_PREFIX + key) || defaultValue;
};

run();
