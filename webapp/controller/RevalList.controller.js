sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/odata/CountMode",
    "sap/m/MessageBox",
    "sap/m/MessageToast"
],
    function (Controller, JSONModel, CountMode, MessageBox, MessageToast) {
        "use strict";

        return Controller.extend("zfi.zfirevalrecon.controller.RevalList", {
            onInit: function () {
                // Set initial view model for any additional data
                var oViewModel = new JSONModel({
                    busy: false,
                    delay: 0
                });
                this.getView().setModel(oViewModel, "viewModel");

                // Wait for metadata to be loaded before initializing smart controls
                var oModel = this.getView().getModel();
                if (oModel) {
                    oModel.setSizeLimit(100000);
                    oModel.getMetaModel().loaded().then(this._initializeSmartControls.bind(this));
                }
            },

            _initializeSmartControls: function () {
                var oSmartFilterBar = this.byId("smartFilterBar");
                var oSmartTable = this.byId("revalReconSmartTable");
                var oSmartVariantManagement = this.byId("smartVariantManagement");

                // Initialize SmartFilterBar first
                if (oSmartFilterBar && !oSmartFilterBar.isInitialised()) {
                    oSmartFilterBar.attachInitialized(function () {
                        // SmartFilterBar is ready

                        // Hide the "Hide Filter Bar" toggle button
                        if (typeof oSmartFilterBar._getHideShowButton === "function") {
                            var oHideShowButton = oSmartFilterBar._getHideShowButton();
                            if (oHideShowButton && typeof oHideShowButton.setVisible === "function") {
                                oHideShowButton.setVisible(false);
                            }
                        }

                        // Only show these four filters in the filter bar
                        var aAllowedFilters = [
                            "$Parameter.p_keydate",
                            "p_keydate",
                            "Ledger",
                            "CompanyCode",
                            "PostingDate"
                        ];

                        var aAllFilterItems = typeof oSmartFilterBar.getAllFilterItems === "function" ? oSmartFilterBar.getAllFilterItems(false) : [];
                        if (Array.isArray(aAllFilterItems)) {
                            aAllFilterItems.forEach(function (oItem) {
                                var sName = oItem && typeof oItem.getName === "function" ? oItem.getName() : null;
                                if (!sName) {
                                    return;
                                }

                                var bAllowed = aAllowedFilters.indexOf(sName) !== -1;
                                if (typeof oItem.setVisibleInFilterBar === "function") {
                                    oItem.setVisibleInFilterBar(bAllowed);
                                }
                                if (typeof oItem.setVisible === "function") {
                                    oItem.setVisible(bAllowed);
                                }
                            });
                        }
                    }.bind(this));
                }

                // Register controls for variant management
                if (oSmartVariantManagement) {
                    if (oSmartFilterBar) {
                        oSmartVariantManagement.addPersonalizableControl(oSmartFilterBar);
                    }
                    if (oSmartTable) {
                        oSmartVariantManagement.addPersonalizableControl(oSmartTable);
                    }

                    // Initialize variant management
                    oSmartVariantManagement.initialise(function () {
                        // Initialization callback
                    }, this);
                }
            },

            onSearch: function (oEvent) {
                // Trigger search on Smart Table
                var oSmartTable = this.byId("revalReconSmartTable");
                if (oSmartTable) {
                    oSmartTable.rebindTable();
                }
            },

            onFilterChange: function (oEvent) {
                // Handle filter change if needed
                // This event is triggered when filters are changed
            },

            onRefresh: function () {
                // Refresh the Smart Table
                var oSmartTable = this.byId("revalReconSmartTable");
                if (oSmartTable) {
                    oSmartTable.rebindTable();
                    MessageToast.show("Table refreshed");
                }
            },

            onExport: function () {
                // Export to Excel functionality
                var oSmartTable = this.byId("revalReconSmartTable");
                if (oSmartTable) {
                    // Trigger the built-in export functionality
                    oSmartTable.exportToExcel();
                }
            },

            onSmartTableInitialise: function (oEvent) {
                var oSmartTable = oEvent.getSource();
                var oInnerTable = oSmartTable && typeof oSmartTable.getTable === "function" ? oSmartTable.getTable() : null;

                // Row navigation arrow is a sap.m concept (ListItemBase type=Navigation).
                // Ensure we're working with the ResponsiveTable (sap.m.Table).
                if (oInnerTable && typeof oInnerTable.isA === "function" && oInnerTable.isA("sap.m.Table")) {
                    // Keep checkbox selection column like your screenshot
                    if (typeof oInnerTable.setMode === "function") {
                        oInnerTable.setMode("MultiSelect");
                    }

                    // Set template + existing items to show navigation arrow
                    var oTemplate = oSmartTable._oTemplate || (oInnerTable.getBindingInfo && oInnerTable.getBindingInfo("items") && oInnerTable.getBindingInfo("items").template);
                    if (oTemplate && typeof oTemplate.setType === "function") {
                        oTemplate.setType("Navigation");
                    }

                    if (typeof oInnerTable.getItems === "function") {
                        oInnerTable.getItems().forEach(function (oItem) {
                            if (oItem && typeof oItem.setType === "function") {
                                oItem.setType("Navigation");
                            }
                        });
                    }

                    if (oInnerTable && oInnerTable.isA("sap.m.Table")) {
                        // prevent duplicate handlers on re-initialization
                        oInnerTable.detachItemPress(this.onTableItemPress, this);
                        oInnerTable.attachItemPress(this.onTableItemPress, this);
                    }

                }
            },

            onBeforeRebindTable: function (oEvent) {
                var oBindingParams = oEvent.getParameter("bindingParams");
                var oSmartFilterBar = this.byId("smartFilterBar");
                var oSmartTable = this.byId("revalReconSmartTable");
                var iMaxRecords = 100000;

                console.log("onBeforeRebindTable called");
                console.log("Initial binding path:", oBindingParams.path);

                if (!oSmartFilterBar) {
                    console.error("SmartFilterBar not found");
                    oEvent.preventDefault();
                    return;
                }

                // Get filter data which contains the custom fields
                var oFilterData = oSmartFilterBar.getFilterData();
                console.log("Filter data:", JSON.stringify(oFilterData));

                // Extract p_keydate from filter data
                // SmartFilterBar stores parameter values with $Parameter prefix
                var sKeyDate = null;

                if (oFilterData) {
                    // Try different property names
                    sKeyDate = oFilterData["$Parameter.p_keydate"] ||
                        oFilterData.p_keydate ||
                        oFilterData._CUSTOM?.p_keydate;

                    console.log("Direct access $Parameter.p_keydate:", oFilterData["$Parameter.p_keydate"]);
                    console.log("Direct access p_keydate:", oFilterData.p_keydate);
                    console.log("All keys in filterData:", Object.keys(oFilterData));

                    // If still not found, try to find it in the object
                    if (!sKeyDate) {
                        for (var key in oFilterData) {
                            console.log("Checking key:", key, "Value:", oFilterData[key]);
                            if (key.indexOf("keydate") !== -1) {
                                sKeyDate = oFilterData[key];
                                console.log("Found keydate in key:", key);
                                break;
                            }
                        }
                    }
                }

                console.log("Extracted p_keydate:", sKeyDate);

                var sLedger = oFilterData && oFilterData.Ledger;
                console.log("Extracted Ledger:", sLedger);

                // Validate that we have the mandatory parameter
                if (!sKeyDate) {
                    MessageBox.error("Valuation Key Date is required. Please enter a date and try again.");
                    oEvent.preventDefault();
                    return;
                }

                if (!sLedger) {
                    MessageBox.error("Ledger is required. Please enter a ledger and try again.");
                    oEvent.preventDefault();
                    return;
                }

                // Format the date for OData
                var oDate = sKeyDate instanceof Date ? sKeyDate : new Date(sKeyDate);
                var sFormattedDate = this._formatODataDate(oDate);

                console.log("Formatted date:", sFormattedDate);

                // Construct the parameterized entity path
                // IMPORTANT: Use the parameter ENTITY SET name from metadata: RevaluationReport
                // (EntityType is RevaluationReportParameters, but the set name is RevaluationReport)
                // Some gateways reject unencoded quotes/colons in key predicates; encode the datetime literal.
                // Keep the named key syntax to match metadata: Key property is 'p_keydate'.
                var sEncodedDateTimeLiteral = "datetime%27" + encodeURIComponent(sFormattedDate) + "%27";
                var sPath = "/RevaluationReport(p_keydate=" + sEncodedDateTimeLiteral + ")/Set";

                // Avoid additional $count calls (SmartTable can trigger them).
                oBindingParams.parameters = oBindingParams.parameters || {};
                oBindingParams.parameters.countMode = CountMode.None;

                // Request all records in one shot (server must allow this size).
                oBindingParams.parameters.$top = iMaxRecords;
                delete oBindingParams.parameters.$skip;
                oBindingParams.length = iMaxRecords;

                // Ensure SmartTable uses the parameterized binding path for ALL internal reads ($count, data, etc.)
                if (oSmartTable) {
                    // Ensure row template shows the navigation arrow for each line
                    if (oSmartTable._oTemplate && typeof oSmartTable._oTemplate.setType === "function") {
                        oSmartTable._oTemplate.setType("Navigation");
                    }

                    if (typeof oSmartTable.setTableBindingPath === "function") {
                        oSmartTable.setTableBindingPath(sPath);
                    } else {
                        // Fallback for older UI5 versions: try setting the property directly
                        oSmartTable.setProperty("tableBindingPath", sPath, true);
                    }

                    var oInnerTable = typeof oSmartTable.getTable === "function" ? oSmartTable.getTable() : null;
                    if (oInnerTable && typeof oInnerTable.setGrowing === "function" && typeof oInnerTable.setGrowingThreshold === "function") {
                        oInnerTable.setGrowing(true);
                        oInnerTable.setGrowingThreshold(iMaxRecords);
                        if (typeof oInnerTable.setGrowingScrollToLoad === "function") {
                            oInnerTable.setGrowingScrollToLoad(false);
                        }

                        // Keep checkbox selection + ensure arrows on already-created items
                        if (typeof oInnerTable.setMode === "function") {
                            oInnerTable.setMode("MultiSelect");
                        }
                        if (typeof oInnerTable.getItems === "function") {
                            oInnerTable.getItems().forEach(function (oItem) {
                                if (oItem && typeof oItem.setType === "function") {
                                    oItem.setType("Navigation");
                                }
                            });
                        }
                    }
                }

                oBindingParams.path = sPath;

                console.log("New binding path:", sPath);

                // Get the regular filters (not custom filters)
                var aFilters = oSmartFilterBar.getFilters();
                var aCleanFilters = [];

                // Remove p_keydate from filters if it exists
                if (aFilters && aFilters.length > 0) {
                    aFilters.forEach(function (oFilterGroup) {
                        if (oFilterGroup.aFilters) {
                            var aInnerFilters = oFilterGroup.aFilters.filter(function (oFilter) {
                                return oFilter.sPath !== "p_keydate" && oFilter.sPath !== "$Parameter.p_keydate";
                            });
                            if (aInnerFilters.length > 0) {
                                oFilterGroup.aFilters = aInnerFilters;
                                aCleanFilters.push(oFilterGroup);
                            }
                        } else if (oFilterGroup.sPath !== "p_keydate" && oFilterGroup.sPath !== "$Parameter.p_keydate") {
                            aCleanFilters.push(oFilterGroup);
                        }
                    });
                }

                console.log("Clean filters:", aCleanFilters);
                oBindingParams.filters = aCleanFilters;
            },

            _formatODataDate: function (oDate) {
                // Format date as YYYY-MM-DDT00:00:00
                var sYear = oDate.getFullYear();
                var sMonth = String(oDate.getMonth() + 1).padStart(2, '0');
                var sDay = String(oDate.getDate()).padStart(2, '0');
                return sYear + "-" + sMonth + "-" + sDay + "T00:00:00";
            },

            onTableItemPress: function (oEvent) {
                debugger;
                var oItem = oEvent.getParameter("listItem");
                var oCtx = oItem && oItem.getBindingContext();

                if (!oCtx) {
                    return;
                }

                // Your entity field seems to be RecordID (from requestAtLeastFields)
                var sRecordId = oCtx.getProperty("RecordID") || oCtx.getProperty("RecordId");

                if (!sRecordId) {
                    MessageToast.show("Record ID not found for selected row.");
                    return;
                }

                // this.getOwnerComponent().getRouter().navTo("RouteOverview", {
                //     RecordId: String(sRecordId)
                // });

                var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
                oRouter.navTo("RouteOverview", {
                    p_keydate: this._formatODataDate(new Date(this.byId("smartFilterBar").getFilterData()["$Parameter.p_keydate"])), // Pass the key date as well
                    RecordId: String(sRecordId)
                });
            }

        });
    });
