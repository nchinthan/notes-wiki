
import math


distribution = {
    "X Mean": 0.445, "X Std": 0.300,"x_kl_loss_tolerance" : 0.1,
    "Y Mean": 0.371, "Y Std": 0.255,"y_kl_loss_tolerance":0.1
}

def kl_divergence(mean1, std1, mean2, std2):
    """
    Compute the KL divergence between two Gaussian distributions.
    """
    var1 = std1 ** 2
    var2 = std2 ** 2
    kl = math.log(std2 / std1) + (var1 + (mean1 - mean2) ** 2) / (2 * var2) - 0.5
    return kl

def authenticate(x_mean, x_std,y_mean, y_std):
    refx_mean, refx_std = distribution["X Mean"], distribution["X Std"]
    refy_mean, refy_std = distribution["Y Mean"], distribution["Y Std"]
    
    kl_loss_x =  kl_divergence(x_mean, x_std, refx_mean, refx_std)
    kl_loss_y =  kl_divergence(y_mean,y_std, refy_mean, refy_std)
    
    if kl_loss_x <= distribution['x_kl_loss_tolerance'] and kl_loss_y <= distribution['y_kl_loss_tolerance']:
        return True 
    else : 
        return False

