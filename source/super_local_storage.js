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
