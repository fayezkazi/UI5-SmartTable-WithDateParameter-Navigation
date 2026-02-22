/*global QUnit*/

sap.ui.define([
	"zfi/zfirevalrecon/controller/RevalList.controller"
], function (Controller) {
	"use strict";

	QUnit.module("RevalList Controller");

	QUnit.test("I should test the RevalList controller", function (assert) {
		var oAppController = new Controller();
		oAppController.onInit();
		assert.ok(oAppController);
	});

});
