sap.ui.define([
    "sap/ui/core/mvc/Controller"
], function (Controller) {
    "use strict";

    return Controller.extend("zfi.zfirevalrecon.controller.OverviewPage", {
        onInit: function () {
            this._oRouter = sap.ui.core.UIComponent.getRouterFor(this);
            this._oRouter.getRoute("RouteOverview").attachPatternMatched(this._onObjectMatched, this);
        },

        _onObjectMatched: function (oEvent) {
            var oArgs = oEvent.getParameter("arguments") || {};
            this._sRecordId = oArgs.RecordId;
            this._sKeyDate = oArgs.p_keydate;

            // UI5 router gives you DECODED route params (spaces etc.).
            // For an OData URL, the key predicate must be URL-encoded (spaces => %20),
            // and single quotes inside the value must be escaped for OData (''),
            // while also avoiding double-encoding if the value already contains %20.
            var sRecordIdEncoded = this._encodeODataKeyString(this._sRecordId);
            var sKeyDate = this._normalizeKeyDate(this._sKeyDate);
            var sEncodedDateTimeLiteral = "datetime%27" + encodeURIComponent(sKeyDate) + "%27";

            var sPath = "/RevaluationReportSet(p_keydate=" + sEncodedDateTimeLiteral + ",RecordID='" + sRecordIdEncoded + "')";

            this.getView().bindElement({
                path: sPath
            });
        },

        _encodeODataKeyString: function (vValue) {
            var sValue = vValue == null ? "" : String(vValue);

            // If it already contains percent-escapes, decode first to prevent % -> %25 double encoding.
            if (/%[0-9A-Fa-f]{2}/.test(sValue)) {
                try {
                    sValue = decodeURIComponent(sValue);
                } catch (e) {
                    // keep original if decoding fails
                }
            }

            // OData V2 string escaping inside single quotes
            sValue = sValue.replace(/'/g, "''");

            // URL-encode for safe transport in the request URL (spaces => %20)
            return encodeURIComponent(sValue);
        },

        _normalizeKeyDate: function (vKeyDate) {
            // We expect something like YYYY-MM-DDT00:00:00 (as you pass from list).
            if (vKeyDate instanceof Date) {
                return this._formatODataDate(vKeyDate);
            }
            return String(vKeyDate || "");
        },

        _formatODataDate: function (oDate) {
            var sYear = oDate.getFullYear();
            var sMonth = String(oDate.getMonth() + 1).padStart(2, "0");
            var sDay = String(oDate.getDate()).padStart(2, "0");
            return sYear + "-" + sMonth + "-" + sDay + "T00:00:00";
        },

        onNavigateToRevalList: function () {
            this._oRouter.navTo("RouteRevalList");
        }
    });
});
