const extCi = require("@cloudbase/extension-ci");
const tcb = require("tcb-admin-node");

tcb.init({
  env: "cloudservices-636o8"
});
tcb.registerExtension(extCi);

exports.main = async (event, context) => {
    const opts = {
          type: "porn,terrorist,politics"
    }
    return await tcb.invokeExtension('CloudInfinite',{
      action:'DetectType',
      cloudPath: event.cloudPath, 
      operations: opts
    })
}
