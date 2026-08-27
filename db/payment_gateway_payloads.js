let paymentGateWayPayLoads = [];

//freeze
function addPaymentGateWayPayLoad(paymentGateWayPayLoad) {
    paymentGateWayPayLoads.push(paymentGateWayPayLoad);
}

//freeze
function getAllNonVerifiedPaymentGateWayPayLoads() {
    const nonVerifiedPaymentGateWayPayLoads = [...paymentGateWayPayLoads];
    paymentGateWayPayLoads = [];
    return nonVerifiedPaymentGateWayPayLoads;
}

module.exports = { addPaymentGateWayPayLoad, getAllNonVerifiedPaymentGateWayPayLoads };
