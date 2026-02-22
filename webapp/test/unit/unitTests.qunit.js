/* global QUnit */
QUnit.config.autostart = false;

sap.ui.getCore().attachInit(function () {
	"use strict";

	sap.ui.require([
		"zfi/zfirevalrecon/test/unit/AllTests"
	], function () {
		QUnit.start();
	});
});
