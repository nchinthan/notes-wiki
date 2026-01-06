
import math


distribution = {
    "normal_access": {
        "X Mean": 0.445, "X Std": 0.300,"x_kl_loss_tolerance" : 0.1,
        "Y Mean": 0.371, "Y Std": 0.255,"y_kl_loss_tolerance":0.1
    },
    "high_level_access": {
        "X Mean": 0.474, "X Std": 0.262,"x_kl_loss_tolerance" : 0.02,
        "Y Mean": 0.520, "Y Std": 0.306,"y_kl_loss_tolerance":0.02
    }
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
    simple = distribution["normal_access"]
    refx_mean, refx_std = simple["X Mean"], simple["X Std"]
    refy_mean, refy_std = simple["Y Mean"], simple["Y Std"]
    
    kl_loss_x =  kl_divergence(x_mean, x_std, refx_mean, refx_std)
    kl_loss_y =  kl_divergence(y_mean,y_std, refy_mean, refy_std)
    
    high_access_dist = distribution["high_level_access"]
    refx_mean_h, refx_std_h = high_access_dist["X Mean"], high_access_dist["X Std"]
    refy_mean_h, refy_std_h = high_access_dist["Y Mean"], high_access_dist["Y Std"]
    
    kl_loss_x_h =  kl_divergence(x_mean, x_std, refx_mean_h, refx_std_h)
    kl_loss_y_h =  kl_divergence(y_mean,y_std, refy_mean_h, refy_std_h)
    
    print("special acess losses:", kl_loss_x_h, kl_loss_y_h)
    
    out = {
        "normal_access":kl_loss_x <= simple['x_kl_loss_tolerance'] and kl_loss_y <= simple['y_kl_loss_tolerance'],
        "high_level_access": kl_loss_x_h <= high_access_dist['x_kl_loss_tolerance'] and kl_loss_y_h <= high_access_dist['y_kl_loss_tolerance'],
    }
    
    return out

