define("BaseCommunicationDetail", ["BaseCommunicationDetailResources", "CtiConstants", "ConfigurationConstants",
	"ViewUtilities", "MultiMaskEdit"
], function (resources, CTIBaseConstants, ConfigurationConstants, ViewUtilities) {
    var emailTypeId = ConfigurationConstants.Communications.UseForAccounts.Other.Email.value;
    var currentItemConfigIndex = 0;
    function validateNumber(value) {
        var invalidMessage = "";
        var isValid = true;
        var communicationType = this.get("CommunicationType");
        var number = value || this.get("Number");
        if (ConfigurationConstants.PhonesCommunicationTypes.indexOf(communicationType.value) !== -1) {
            isValid = (Ext.isEmpty(number) ||
				new RegExp("^\\8\\([0-9][0-9][0-9]\\)[0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]$").test(number));
            if (!isValid) {
                invalidMessage = "Некорректный номер";
            }
        }
        return {
            invalidMessage: invalidMessage,
            isValid: isValid
        };
    }
    return {
        messages: {
            "GetContactCommunicationOnItemChange": {
                mode: Terrasoft.MessageMode.PTP,
                direction: Terrasoft.MessageDirectionType.PUBLISH
            }
        },
        methods: {
            /**
			 * получить только цифры из строки
			 */
            getDigitsFromString: function (value) {
                return value.replace(/\D/g, "");
            },
            getMask: function (communicationType) {
                if (this.isPhoneTypeForMask(communicationType)) {
                    return {
                        formats: ["8(999)999-99-99"]
                    };
                } else if (communicationType.value === "e9d91e45-8d92-4e38-95a0-ef8aa28c9e7a") {
                    return {
                        formats: ["9999"]
                    };
                }
                return [];
            },
            // исключает тип "Внутренний номер"
            isPhoneTypeForMask: function (communicationType) {
                var communicationTypes = {
                    Facebook: "2795dd03-bacf-e011-92c3-00155d04c01d",
                    LinkedIn: "ea0f3b0a-bacf-e011-92c3-00155d04c01d",
                    Google: "efe5d7a2-5f38-e111-851e-00155d04c01d",
                    Twitter: "e7139487-bad3-e011-92c3-00155d04c01d",
                    Phone: "3dddb3cc-53ee-49c4-a71f-e9e257f59e49",
                    MainPhone: "6a3fb10c-67cc-df11-9b2a-001d60e938c6",
                    AdditionalPhone: "2b387201-67cc-df11-9b2a-001d60e938c6",
                    MobilePhone: "d4a2dc80-30ca-df11-9b2a-001d60e938c6",
                    HomePhone: "0da6a26b-d7bc-df11-b00f-001d60e938c6",
                    Fax: "9a7ab41b-67cc-df11-9b2a-001d60e938c6",
                    Web: "6a8ba927-67cc-df11-9b2a-001d60e938c6",
                    OtherPhone: "21c0d693-9a52-43fa-b7f1-c6d8b53975d4" //другой телефон
                };

                var phonesCommunicationTypes = [
					communicationTypes.Phone,
					communicationTypes.MobilePhone,
					communicationTypes.HomePhone,
					communicationTypes.MainPhone,
					communicationTypes.AdditionalPhone,
					communicationTypes.Fax,
					communicationTypes.OtherPhone
                ];

                communicationType = communicationType.value || communicationType;
                return phonesCommunicationTypes.indexOf(communicationType) !== -1;
            },
            getMaskEditConfig: function (maskConfig) {
                var result = {
                    className: "Terrasoft.MultiMaskEdit",
                    mask: {
                        bindTo: "Masks"
                    },
                    onBeforePasteFormatValue: this.getDigitsFromString
                };
                if (maskConfig) {
                    result.maskConfig = maskConfig;
                }
                return result;
            },
            /**
			 * @inheritdoc Terrasoft.BaseCommunicationDetail#getItemViewConfig
			 * @overridden
			 */
            getItemViewConfig: function (itemConfig, item) {
                this.callParent(arguments);
                this.set("itemViewConfig", null);
                var items = itemConfig.config.items;
                var textEditIndex = 1; //TODO: Добавить константу
                var testEdit = items[textEditIndex];
                Ext.apply(testEdit, this.getMaskEditConfig());
                //получаем маску по типу
                var communicationType = item.get("CommunicationType");
                item.set("Masks", this.getMask(communicationType));
            },
            initItem: function (detailModel) {
                this.set("PhoneCommunicationTypes", detailModel.get("PhoneCommunicationTypes"));
                detailModel.addColumnValidator("Number", validateNumber, this);
            },
            onItemChanged: function (item, config) {
                this.callParent(arguments);
                var communicationType = item.get("CommunicationType");
                item.set("Masks", this.getMask(communicationType));

                //ниже идет часть для реализации "Проверка на дубли по средствам связи"
                //Паблишим событие "GetContactCommunicationOnItemChange" и в качестве параметра передается
                //список заполненых средств связи (сделано специально чтобы можно было делать проверку
                //по средствам связи без сохранения основной карточки
                var collection = this.get("Collection");
                if (!Ext.isEmpty(collection.collection)) {
                    var items = collection.collection.items;
                    this.sandbox.publish("GetContactCommunicationOnItemChange", items, [this.sandbox.id]);
                }
            },
            addItem: function (tag) {
                var collection = this.get("Collection");
                var items = collection.getItems();
                var itemsLength = items.length;
                this.callParent(arguments);
                var newItemsLength = items.length;
                if (itemsLength === newItemsLength) {
                    return;
                }
                var itemViewModel = items[newItemsLength - 1];
                this.initItem.call(itemViewModel, this);
            },
            initItems: function () {
                if (this.get("IsDataLoaded")) {
                    var collection = this.get("Collection");
                    Terrasoft.each(collection.getItems(), function (item) {
                        this.initItem.call(item, this);
                    }, this);
                }
            },
            /**
			 * Загружает средства связи
			 * @protected
			 * @virtual
			 * @param {Function} callback callback-функция
			 * @param {Terrasoft.BaseSchemaViewModel} scope Контекст выполнения callback-функции
			 */
            loadContainerListData: function (callback, scope) {
                this.callParent([function () {
                    // Добавляем валидатор перед сохранением записи
                    this.initItems();
                    callback.call(scope);
                }, this]);
            }
            //TODO: добавить свою валидацию, регулярное выражение для валидации поля можно скопировать
            // из mask.re.full в MultiMaskEdit
        }
    };
});
