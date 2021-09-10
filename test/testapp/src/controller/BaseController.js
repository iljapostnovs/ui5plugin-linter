sap.ui.define([
	"com/test/library/control/BaseController",
	"sap/m/DateTimeInput"
], function(
	BaseController,
	DateTimeInput
) {
	"use strict";
	return BaseController.extend("com.test.controller.BaseController", {
		_test: function() {
			//
		},

		getModel: function(sModelName) {
			return this.getView().getModel(sModelName) || this.getOwnerComponent().getModel(sModelName);
		}
	});
});