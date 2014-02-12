/**
 * Views for the Legislator Tracker app
 */

(function(global, factory) {
  // Common JS (i.e. browserify) environment
  if (typeof module !== 'undefined' && module.exports && typeof require === 'function') {
    factory(require('underscore'), require('jquery'), require('backbone'), require('moment'), require('LT'), require('LTModels'), require('LTCollections'));
  }
  // AMD?
  else if (typeof define === 'function' && define.amd) {
    define('LTViews', ['underscore', 'jquery', 'backbone', 'moment', 'LT', 'LTModels', 'LTCollections'], factory);
  }
  // Browser global
  else if (global._ && global.jQuery && global.Backbone && global.moment && global.LT && global.LT.Models && global.LT.Collections) {
    global.LT.Views = factory(global._, global.jQuery, global.Backbone, global.moment, global.LT, global.LT.Models, global.LT.Collections);
  }
  else {
    throw new Error('Could not find dependencies for LT Views.');
  }
})(typeof window !== 'undefined' ? window : this, function(_, $, Backbone, moment, LT, LTModels, LTCollections) {

  // Object to hold the views
  var views = {};

  /**
   * Main View for application.
   */
  views.MainApplicationView = Backbone.View.extend({
    initialize: function(options) {
      this.options = options;

      // Add class to ensure our styling does
      // not mess with other stuff
      this.$el.addClass('ls');

      // Get templates
      this.templates = this.templates || {};
      LT.utils.getTemplate('template-loading', this.templates, 'loading');
      LT.utils.getTemplate('template-error', this.templates, 'error');
      LT.utils.getTemplate('template-ebill', this.templates, 'ebill');
      LT.utils.getTemplate('template-osbill', this.templates, 'osbill');
      LT.utils.getTemplate('template-category', this.templates, 'category');
      LT.utils.getTemplate('template-categories', this.templates, 'categories');
      LT.utils.getTemplate('template-header', this.templates, 'header');

      // Bind all
      _.bindAll(this, 'expandBill', 'expandOtherBills');
    },

    events: {
      'click .bill-expand': 'expandBill',
      'click .expand-other-bills': 'expandOtherBills'
    },

    loading: function() {
      // The first (and second) load, we don't actually
      // want to force the scroll
      if (_.isNumber(this.options.scrollOffset)) {
        if (this.initialLoad === true) {
          this.resetScrollView();
        }
        else {
          this.initialLoad = (_.isUndefined(this.initialLoad)) ? false : true;
        }
      }
      this.$el.html(this.templates.loading({}));
      return this;
    },

    error: function(e) {
      this.$el.html(this.templates.error({ error: e }));
      return this;
    },

    renderCategories: function() {
      this.$el.html(this.templates.categories({
        categories: LT.app.categories.toJSON(),
        options: LT.options,
        totalBills: LT.app.totalBills,
        totalBillsSigned: LT.app.totalBillsSigned,
        utils: LT.utils
      }));
    },

    renderCategory: function(category) {
      var thisView = this;
      var data;

      if (!_.isObject(category)) {
        category = LT.app.categories.get(category);
      }
      category.get('bills').sort();

      this.$el.html(this.templates.category({
        category: category.toJSON(),
        templates: this.templates,
        header: this.renderHeader()
      }));
      this.getLegislators().navigationGlue();
    },

    renderEBill: function(bill) {
      if (!_.isObject(bill)) {
        bill = this.router.bills.get(bill);
      }
      bill.newestAction();

      this.$el.html(this.templates.ebill({
        bill: bill.toJSON(),
        expandable: false,
        templates: this.templates,
        header: this.renderHeader()
      }));
      this.getLegislators().checkOverflows().navigationGlue();
    },

    renderOSBill: function(bill) {
      this.$el.html(this.templates.osbill({
        bill: bill.toJSON(),
        detailed: true,
        templates: this.templates,
        header: this.renderHeader()
      }));
      this.getLegislators().checkOverflows().navigationGlue();
    },

    renderHeader: function() {
      return this.templates.header({
        categories: LT.app.categories.toJSON()
      });
    },

    expandBill: function(e) {
      e.preventDefault();
      var $this = $(e.target);
      var text = [ 'More detail', 'Less detail' ];
      var current = $this.text();

      $this.text((current === text[0]) ? text[1] : text[0]);
      $this.parent().parent().toggleClass('expanded').find('.bill-bottom').slideToggle();

      this.checkOverflows();
      return this;
    },

    expandOtherBills: function(e) {
      e.preventDefault();
      var $this = $(e.target);
      var text = [ 'Show other bills', 'Hide other bills' ];
      var current = $this.text();

      $this.text((current === text[0]) ? text[1] : text[0]);
      $this.parent().find('.has-conference-bill').toggleClass('showing').slideToggle();

      this.checkOverflows();
      return this;
    },

    getLegislators: function() {
      this.$el.find('.sponsor:not(.found)').each(function() {
        var $this = $(this);
        var data = $this.data();
        data.id = data.legId;

        if (data.id) {
          var leg = LT.utils.getModel('OSLegislatorModel', 'id', data);
          $.when(LT.utils.fetchModel(leg)).then(function() {
            var view = new views.LegislatorView({
              el: $this,
              model: leg
            }).render();
          });
        }
      });
      return this;
    },

    checkOverflows: function() {
      this.$el.find('.actions-inner, .co-sponsors-inner').each(function() {
        if ($(this).hasScrollBar()) {
          $(this).addClass('overflowed');
        }
      });
      return this;
    },

    resetScrollView: function() {
      $('html, body').animate({ scrollTop: this.$el.offset().top - LT.options.scrollOffset }, 1000);
      return this;
    },

    navigationGlue: function() {
      var containerTop = this.$el.offset().top;
      var $navigation = $('.ls-header');

      // The header container should be as high as the
      // the header so that it does not jump when
      // its gets glued
      $('.ls-header-container').height($navigation.outerHeight());

      $(window).scroll(function() {
        var $this = $(this);

        // Add class for fixed menu
        if (($this.scrollTop() > containerTop) && !$navigation.hasClass('glued')) {
          $navigation.addClass('glued');
        }
        else if (($this.scrollTop() <= containerTop) && $navigation.hasClass('glued')) {
          $navigation.removeClass('glued');
        }
      });
      return this;
    }
  });

  /**
   * Legislator view.
   */
  views.LegislatorView = Backbone.View.extend({
    model: LTModels.OSLegislatorModel,

    initialize: function(options) {
      // Get templates
      this.templates = this.templates || {};
      LT.utils.getTemplate('template-legislator', this.templates, 'legislator');
    },

    render: function() {
      this.$el.addClass('found')
        .html(this.templates.legislator(this.model.toJSON()));
      return this;
    }
  });


  _.extend(LT, views);
  return views;
});