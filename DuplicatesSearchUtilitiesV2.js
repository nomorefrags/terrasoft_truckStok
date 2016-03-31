define("DuplicatesSearchUtilitiesV2", ["StorageUtilities", "DuplicatesSearchUtilitiesV2Resources"],
	function (storageUtilities) {
	    Ext.define("Terrasoft.configuration.mixins.DuplicatesSearchUtilitiesV2", {
	        alternateClassName: "Terrasoft.DuplicatesSearchUtilitiesV2",

	        /**
			 * ���� ������ � ������� ����
			 * @protected
			 * @type {String}
			 */
	        storageKey: "DuplicateStorage",

	        /**
			 * ���������� ���� ���� ������������� ����������� ����� ������
			 * @protected
			 * @virtual
			 * @return {string} ���������� ���� ���� ������������� ����������� ����� ������
			 */
	        getPerformSearchOnSaveKey: function () {
	            return this.entitySchema.name + "PerformSearchOnSave";
	        },

	        /**
			 * ���������� ������������� ������ ������ ������
			 * @protected
			 * @virtual
			 * @return {string} ���������� ������������� ������ ������ ������
			 */
	        getDuplicateSearchPageId: function () {
	            return this.sandbox.id + "_LocalDuplicateSearchPage";
	        },

	        /**
			 * ���������� ��� ���������� ������ ��� ������ ������
			 * @protected
			 * @virtual
			 * @return {string} ���������� ��� ���������� ������ ��� ������ ������
			 */
	        getFindDuplicatesMethodName: Terrasoft.abstractFn,

	        /**
			 * ���������� ��� ���������� ������ ���������� ���������� ������ � �������
			 * @protected
			 * @virtual
			 * @return {string} ���������� ��� ���������� ������ ���������� ���������� ������ � �������
			 */
	        getSetDuplicatesMethodName: Terrasoft.abstractFn,

	        /**
			 * �������������� ��������� �������, ������������� �� ����������� ���������
			 * @protected
			 * @virtual
			 */
	        init: function () {
	            var performSearchOnSave = storageUtilities.getItem(this.storageKey, this.getPerformSearchOnSaveKey());
	            if (!this.Ext.isEmpty(performSearchOnSave)) {
	                this.set("PerformSearchOnSave", performSearchOnSave);
	            } else {
	                var serviceMethodName = "Get" + this.getPerformSearchOnSaveKey();
	                this.callService({
	                    serviceName: "NavSearchDuplicatesServiceEx",
	                    methodName: serviceMethodName,
	                    encodeData: false
	                }, function (response) {
	                    performSearchOnSave = response[serviceMethodName + "Result"];
	                    storageUtilities.setItem(performSearchOnSave, this.storageKey, this.getPerformSearchOnSaveKey());
	                    this.set("PerformSearchOnSave", performSearchOnSave);
	                }, this);
	            }
	            this.sandbox.subscribe("GetDuplicateSearchConfig", function () {
	                return {
	                    entitySchemaName: this.entitySchema.name,
	                    cardSandBoxId: this.sandbox.id, //TODO: ��� �� �������� ������?
	                    list: this.get("FindDuplicatesResult"),
	                    dataSend: this.get("DuplicatesDataSend") // TODO: ����� ��������,
	                    // ������ LocalDuplicateSearchPage � ���� ������ �� ���������������
	                };
	            }, this, [this.getDuplicateSearchPageId()]);
	            this.sandbox.subscribe("FindDuplicatesResult", function (result) {
	                var dataSend = {
	                    isNotDuplicate: result.isNotDuplicate,
	                    notDuplicateList: result.collection,
	                    request: result.config.request
	                };
	                this.set("DuplicateResponse", dataSend);
	                this.sandbox.unloadModule(this.getDuplicateSearchPageId(), "centerPanel");
	                //TODO: ������ ��� ������ �������� � �� ����?
	                this.save();
	            }, this, [this.sandbox.id]);
	        },

	        /**
			 * ���� ����� � ������� "�����������". ���� ���� �����������/������� ������, ���������� ��� ������
			 * ���� �� ���������� ���, �� �������� callback-�������
			 * @protected
			 * @virtual
			 * @param {Function} callback callback-�������
			 * @param {Terrasoft.BaseSchemaViewModel} scope �������� ���������� callback-�������
			 */
	        findOnSave: function (callback, scope) {
	            if (this.get("DuplicateResponse")) {
	                var resultObject = { success: true };
	                callback.call(scope, resultObject);
	            } else {

	                var communication = [];
	                var entitySchemaName = this.entitySchema.name;

	                var select = this.Ext.create("Terrasoft.EntitySchemaQuery", {
	                    rootSchemaName: entitySchemaName + "Communication"
	                });
	                select.addColumn("Id");
	                select.addColumn("Number");

	                select.filters.addItem(select.createColumnFilterWithParameter(this.Terrasoft.ComparisonType.EQUAL,
						entitySchemaName, this.get("Id")));

	                select.getEntityCollection(function (response) {
	                    if (response.success) {
	                        response.collection.each(function (item) {
	                            var newNumber = {
	                                Id: item.get("Id"),
	                                Number: item.get("Number")
	                            };
	                            communication.push(newNumber);
	                        }, this);
	                        if (entitySchemaName == "Contact") communication = this.ContactCommunicationList;

	                        var data = {
	                            request: {
	                                Id: this.get("Id"),
	                                Name: this.get("Name"),
	                                AlternativeName: this.get("AlternativeName"),
	                                Communication: communication
	                            }
	                        };
	                        this.set("DuplicatesDataSend", data);
	                        this.callService({
	                            data: data,
	                            serviceName: "NavSearchDuplicatesServiceEx",
	                            methodName: this.getFindDuplicatesMethodName(),
	                            encodeData: false
	                        }, function (response) {
	                            var result = response[this.getFindDuplicatesMethodName() + "Result"];
	                            if (result.length > 0) {
	                                this.set("FindDuplicatesResult", result);
	                                this.loadLocalDuplicateSearchPage();
	                                this.hideBodyMask();
	                            } else {
	                                var resultObject = { success: true };
	                                callback.call(scope, resultObject);
	                            }
	                        }, this);
	                    }
	                }, this);
	            }
	        },

	        /**
			 * ���������� ��������� ������ � �����������
			 * @protected
			 * @virtual
			 */
	        setDuplicates: function (callback) {
	            if (this.get("PerformSearchOnSave") && !Ext.isEmpty(this.get("DuplicateResponse"))) {
	                this.callService({
	                    data: this.get("DuplicateResponse"),
	                    serviceName: "NavSearchDuplicatesServiceEx",
	                    methodName: this.getSetDuplicatesMethodName(),
	                    encodeData: false
	                }, function () {
	                    if (callback) {
	                        callback.call(this);
	                    }
	                }, this);
	            } else {
	                if (callback) {
	                    callback.call(this);
	                }
	            }
	        },

	        /**
			 * ��������� ������ ������ �����������
			 * @protected
			 * @virtual
			 */
	        loadLocalDuplicateSearchPage: function () {
	            var moduleId = this.getDuplicateSearchPageId();
	            var params = this.sandbox.publish("GetHistoryState");
	            this.sandbox.publish("PushHistoryState", {
	                hash: params.hash.historyState,
	                stateObj: {
	                    cardSandBoxId: this.sandbox.id//TODO: ����� ����������� ����� ���������?
	                }
	            });
	            //TODO: realize duplicate search page, which depends on card mode
	            //if (this.get("IsSeparateMode") === false) {
	            this.sandbox.loadModule("LocalDuplicateSearchPage", {
	                renderTo: "centerPanel", //TODO: ��������� ������ ������ ��� �������� ��� ������.
	                // �� ����� ���� ���������, � �� ��������� �� ���
	                id: moduleId,
	                keepAlive: true
	            });
	        }

	    });
	    return Ext.create("Terrasoft.DuplicatesSearchUtilitiesV2");
	});